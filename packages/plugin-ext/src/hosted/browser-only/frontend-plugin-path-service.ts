// *****************************************************************************
// Copyright (C) 2023 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// ****************************************************************************

import { inject, injectable, named } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core';
import URI from '@theia/core/lib/common/uri';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { generateUuid, hashValue } from '@theia/core/lib/common/uuid';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { UntitledWorkspaceService } from '@theia/workspace/lib/common';
import { PluginPathsService } from '../../main/common/plugin-paths-protocol';
import { PluginPaths } from '../../main/common/paths/const';
import { getWebLocks, requestLock, WarnOnce } from './web-locks';

/**
 * Names of the per-session log folders, e.g. `20181205T093828-3e62e0e7-4934-41d6-8fa5-a38faaad2249`.
 *
 * Unlike the backend, where one `PluginPathsServiceImpl` singleton serves every tab, each browser
 * tab runs its own instance of this service; a timestamp alone, as the backend uses, is not enough
 * to keep them apart, since duplicating a tab or restoring a session commonly opens several within
 * the same second. The random suffix guarantees a folder of its own regardless.
 */
const SESSION_FOLDER_PATTERN = /^\d{8}T\d{6}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** How many per-session log folders to keep, i.e. the backend's `--plugin-max-session-logs-folders` default. */
const MAX_SESSION_LOGS_FOLDERS = 10;

/**
 * Prefix of the Web Locks API lock a tab holds for as long as it is open, named after its own
 * session folder, so that {@link FrontendPluginPathService.cleanUpOldLogs} can tell a tab that is
 * still open apart from one whose session has actually ended - count alone cannot, since e.g.
 * restoring a session can open more tabs at once than {@link MAX_SESSION_LOGS_FOLDERS}.
 */
const SESSION_LOCK_PREFIX = 'theia:plugin-log-session:';

/**
 * Resolves the plugin log and storage locations of a browser-only application below the config
 * directory, which is backed by the same (browser local) file system as the workspace itself.
 */
@injectable()
export class FrontendPluginPathService implements PluginPathsService {

    @inject(ILogger) @named('plugin-ext:FrontendPluginPathService')
    protected readonly logger: ILogger;

    @inject(EnvVariablesServer)
    protected readonly envServer: EnvVariablesServer;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(UntitledWorkspaceService)
    protected readonly untitledWorkspaceService: UntitledWorkspaceService;

    protected configDirUri: Promise<URI> | undefined;
    protected hostLogPath: Promise<string> | undefined;
    protected readonly hostStoragePaths = new Map<string, Promise<string>>();

    getHostLogPath(): Promise<string> {
        return this.hostLogPath ??= this.resolveHostLogPath()
            .catch(error => {
                this.hostLogPath = undefined;
                throw error;
            });
    }

    getHostStoragePath(workspaceUri: string | undefined, rootUris: string[]): Promise<string | undefined> {
        if (!workspaceUri) {
            // no workspace, hence no place to store workspace state, as on the backend
            return Promise.resolve(undefined);
        }
        const cacheKey = `${workspaceUri}:${[...rootUris].sort().join(',')}`;
        let hostStoragePath = this.hostStoragePaths.get(cacheKey);
        if (!hostStoragePath) {
            hostStoragePath = this.resolveHostStoragePath(workspaceUri, rootUris)
                .catch(error => {
                    this.hostStoragePaths.delete(cacheKey);
                    throw error;
                });
            this.hostStoragePaths.set(cacheKey, hostStoragePath);
        }
        return hostStoragePath;
    }

    /**
     * Each session logs into a folder of its own, as on the backend, so that the tabs of an
     * application do not write over each other's logs.
     */
    protected async resolveHostLogPath(): Promise<string> {
        const logsDirUri = (await this.getConfigDirUri()).resolve(PluginPaths.PLUGINS_LOGS_DIR);
        const folderName = this.generateSessionFolderName();
        // awaited: the folder must not exist on disk before the lock is actually held, or another
        // tab's cleanup could list it, query() before the grant, and prune it as if it were dead
        await this.markSessionAlive(folderName);
        const hostLogPath = await this.ensureDirectory(logsDirUri.resolve(folderName).resolve('host'));
        // as on the backend, we never wait for the cleanup
        this.cleanUpOldLogs(logsDirUri, folderName).catch(error => this.logger.error('Failed to clean up old plugin log folders:', error));
        return hostLogPath;
    }

    protected async resolveHostStoragePath(workspaceUri: string, rootUris: string[]): Promise<string> {
        const configDirUri = await this.getConfigDirUri();
        const workspaceId = await this.buildWorkspaceId(configDirUri, workspaceUri, rootUris);
        return this.ensureDirectory(configDirUri.resolve(PluginPaths.PLUGINS_WORKSPACE_STORAGE_DIR).resolve(workspaceId));
    }

    /**
     * Generates a folder name in the format `YYYYMMDDTHHMMSS-<uuid>`, for example
     * `20181205T093828-3e62e0e7-4934-41d6-8fa5-a38faaad2249`. The timestamp keeps folders roughly
     * sorted by recency for {@link cleanUpOldLogs}; the suffix is what actually guarantees
     * uniqueness, including between two tabs created in the same second.
     */
    protected generateSessionFolderName(): string {
        const timeStamp = new Date().toISOString().replace(/[-:]|(\..*)/g, '');
        const folderName = `${timeStamp}-${generateUuid()}`;
        if (!SESSION_FOLDER_PATTERN.test(folderName)) {
            this.logger.error(`Generated log folder name: "${folderName}" does not match expected pattern: ${SESSION_FOLDER_PATTERN}`);
        }
        return folderName;
    }

    /**
     * Holds the Web Locks API lock named after `folderName` for as long as this tab's document
     * exists: the browser releases it automatically when the tab is closed or navigated away from,
     * which is exactly the "is this session still open" signal {@link cleanUpOldLogs} needs.
     *
     * Resolves only once the lock is actually granted, i.e. once `navigator.locks.query()` is
     * guaranteed to report it as held. `request()` grants a lock asynchronously - across tabs, it has
     * to - so a caller that did not wait for this could create the session folder on disk before the
     * lock protecting it exists, during which another tab's {@link cleanUpOldLogs} could see the
     * folder, query the not-yet-held lock, and prune it as if the session had already ended.
     *
     * Also resolves, rather than hanging forever, if `request()` itself rejects without ever
     * invoking the callback - for example because the document is not fully active at the time. A
     * plugin host that never starts because it could not secure the log folder's liveness lock would
     * be worse than the pre-existing, already-accepted risk that a live session's folder is pruned by
     * another tab while the Web Locks API is unavailable, which this falls back to in that case too.
     */
    protected async markSessionAlive(folderName: string): Promise<void> {
        const locks = getWebLocks();
        if (!locks) {
            return;
        }
        const granted = new Deferred<void>();
        // resolves `granted` from inside the callback, i.e. only once the lock is actually held, and
        // then never settles itself, so the lock stays held until this document is destroyed
        const holdUntilTabCloses = (): Promise<void> => {
            granted.resolve();
            return new Promise<void>(() => { /* never settles */ });
        };
        requestLock(locks, `${SESSION_LOCK_PREFIX}${folderName}`, holdUntilTabCloses)
            .catch(error => {
                this.logger.warn(`Failed to acquire the liveness lock for plugin log folder '${folderName}':`, error);
                granted.resolve();
            });
        await granted.promise;
    }

    /**
     * Keeps the {@link MAX_SESSION_LOGS_FOLDERS} most recent session folders, so that reloading does
     * not fill up the browser storage - except `ownFolderName`, which this call is never allowed to
     * touch, and any folder {@link isSessionAlive} reports as still open: count alone cannot tell a
     * completed session apart from a tab that is still open, and restoring a browser session can
     * plausibly open more tabs at once than {@link MAX_SESSION_LOGS_FOLDERS}.
     */
    protected async cleanUpOldLogs(logsDirUri: URI, ownFolderName: string): Promise<void> {
        const logsDir = await this.fileService.resolve(logsDirUri);
        const candidates = (logsDir.children ?? [])
            // we never clean a folder that is not a session folder of ours, or the one just created above
            .filter(child => child.isDirectory && child.resource.path.base !== ownFolderName && SESSION_FOLDER_PATTERN.test(child.resource.path.base))
            .map(child => child.resource)
            // newest first, so that the oldest ones are the ones cut off; ties within the same second,
            // e.g. several tabs opened together, are broken arbitrarily by the random suffix, which is fine
            .sort((one, other) => other.path.base.localeCompare(one.path.base));
        // `ownFolderName` occupies one of the retained slots without being a candidate above
        const prunable = candidates.slice(MAX_SESSION_LOGS_FOLDERS - 1);
        if (prunable.length === 0) {
            return;
        }
        const stillOpen = await this.queryOpenSessions();
        if (!stillOpen) {
            FrontendPluginPathService.missingLocksWarning.warn(this.logger, 'Web Locks API unavailable: cannot tell a still-open tab\'s log folder from a '
                + 'completed session; pruning old plugin log folders by count alone.');
        }
        await Promise.all(prunable
            .filter(uri => !stillOpen?.has(uri.path.base))
            .map(uri => this.fileService.delete(uri, { fromUserGesture: false, recursive: true })));
    }

    /**
     * The session folder names of every tab currently holding its {@link markSessionAlive} lock, or
     * `undefined` if the Web Locks API is unavailable, i.e. there is no way to tell.
     */
    protected async queryOpenSessions(): Promise<Set<string> | undefined> {
        const locks = getWebLocks();
        if (!locks) {
            return undefined;
        }
        const { held } = await locks.query();
        const openSessions = new Set<string>();
        for (const lock of held ?? []) {
            if (lock.name?.startsWith(SESSION_LOCK_PREFIX)) {
                openSessions.add(lock.name.slice(SESSION_LOCK_PREFIX.length));
            }
        }
        return openSessions;
    }

    protected static readonly missingLocksWarning = new WarnOnce();

    protected async buildWorkspaceId(configDirUri: URI, workspaceUri: string, rootUris: string[]): Promise<string> {
        if (this.untitledWorkspaceService.isUntitledWorkspace(new URI(workspaceUri), configDirUri)) {
            // an untitled workspace is named anew in every session, so key its storage on the roots instead
            return hashValue([...rootUris].sort().join(','));
        }
        return hashValue(workspaceUri);
    }

    /**
     * Creates the given directory, tolerating it already existing, and returns its path. Plugins
     * receive the path rather than the URI, e.g. as `ExtensionContext.storagePath`.
     */
    protected async ensureDirectory(uri: URI): Promise<string> {
        // tolerates the directory already existing, so no exists() check is needed first
        await this.fileService.createFolder(uri, { fromUserGesture: false });
        return this.fileService.fsPath(uri);
    }

    protected getConfigDirUri(): Promise<URI> {
        return this.configDirUri ??= this.envServer.getConfigDirUri().then(uri => new URI(uri));
    }
}
