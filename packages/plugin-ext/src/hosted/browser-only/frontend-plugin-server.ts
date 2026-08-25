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
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { PluginDeployOptions, PluginIdentifiers, PluginServer, PluginStorageKind, PluginType } from '../../common';
import { KeysToAnyValues, KeysToKeysToAnyValue } from '../../common/types';
import { PluginPathsService } from '../../main/common/plugin-paths-protocol';
import { getWebLocks, requestLock, WarnOnce } from './web-locks';

const GLOBAL_STORAGE_KEY = 'plugin-storage:global';
const WORKSPACE_STORAGE_KEY_PREFIX = 'plugin-storage:workspace:';
const LOCK_NAME_PREFIX = 'theia:plugin-storage:';

/**
 * Plugins of a browser-only application are deployed at build time, so they cannot be
 * installed, uninstalled, enabled or disabled at runtime. The queries report an empty
 * result rather than failing, so that callers such as the plugin view can render.
 *
 * The plugin key-value storage backing `ExtensionContext.globalState` and
 * `ExtensionContext.workspaceState` is kept in the browser storage of the current host.
 */
@injectable()
export class FrontendPluginServer implements PluginServer {

    @inject(ILogger) @named('plugin-ext:FrontendPluginServer')
    protected readonly logger: ILogger;

    @inject(StorageService)
    protected readonly storageService: StorageService;

    @inject(PluginPathsService)
    protected readonly pluginPathsService: PluginPathsService;

    /**
     * Fallback for {@link withStoreLock} when the Web Locks API is unavailable. Shared by every
     * instance in this JS realm (`static`, not `protected readonly`), since two `FrontendPluginServer`s
     * in the same realm - e.g. two plugin hosts sharing one page - would otherwise not serialize
     * against each other either.
     */
    protected static readonly localLocks = new Map<string, Promise<unknown>>();
    protected static readonly missingLocksWarning = new WarnOnce();

    async install(pluginEntry: string, type?: PluginType, options?: PluginDeployOptions): Promise<void> {
        throw new Error('Installing plugins is not supported in a browser-only application.');
    }

    async uninstall(pluginId: PluginIdentifiers.VersionedId): Promise<void> {
        throw new Error('Uninstalling plugins is not supported in a browser-only application.');
    }

    async enablePlugin(pluginId: PluginIdentifiers.UnversionedId): Promise<boolean> {
        throw new Error('Enabling plugins is not supported in a browser-only application.');
    }

    async disablePlugin(pluginId: PluginIdentifiers.UnversionedId): Promise<boolean> {
        throw new Error('Disabling plugins is not supported in a browser-only application.');
    }

    async getInstalledPlugins(): Promise<readonly PluginIdentifiers.VersionedId[]> {
        return [];
    }

    async getUninstalledPlugins(): Promise<readonly PluginIdentifiers.VersionedId[]> {
        return [];
    }

    async getDisabledPlugins(): Promise<readonly PluginIdentifiers.UnversionedId[]> {
        return [];
    }

    async setStorageValue(key: string, value: KeysToAnyValues, kind: PluginStorageKind): Promise<boolean> {
        const storeKey = await this.getStoreKey(kind);
        if (!storeKey) {
            this.logger.warn('Cannot save plugin data: no opened workspace.');
            return false;
        }
        // the browser storage is shared with the application's other tabs, each of which runs its own
        // plugin host, so the read and the write below have to be atomic or a concurrent update on
        // another tab could be read here before it is written, and then be overwritten by this one
        await this.withStoreLock(storeKey, async () => {
            const store = await this.getStore(storeKey);
            if (value === undefined || Object.keys(value).length === 0) {
                delete store[key];
            } else {
                store[key] = value;
            }
            await this.storageService.setData(storeKey, store);
        });
        return true;
    }

    async getStorageValue(key: string, kind: PluginStorageKind): Promise<KeysToAnyValues> {
        return (await this.getAllStorageValues(kind))[key] ?? {};
    }

    async getAllStorageValues(kind: PluginStorageKind): Promise<KeysToKeysToAnyValue> {
        const storeKey = await this.getStoreKey(kind);
        return storeKey ? this.getStore(storeKey) : {};
    }

    protected getStore(storeKey: string): Promise<KeysToKeysToAnyValue> {
        return this.storageService.getData<KeysToKeysToAnyValue>(storeKey, {});
    }

    /**
     * Runs `task` while holding the cross-tab lock for `storeKey`, via the Web Locks API, so that a
     * concurrent {@link setStorageValue} on this or another tab cannot interleave with it.
     */
    protected withStoreLock<T>(storeKey: string, task: () => Promise<T>): Promise<T> {
        const locks = getWebLocks();
        if (locks) {
            return requestLock(locks, `${LOCK_NAME_PREFIX}${storeKey}`, task);
        }
        // Web Locks API unavailable, e.g. an insecure context or an older browser: fall back to
        // serializing writes within this JS realm. A concurrent write from a different tab, which
        // does not share this realm, can then still be lost.
        FrontendPluginServer.missingLocksWarning.warn(this.logger, 'Web Locks API unavailable: plugin storage updates from different tabs may race.');
        const queue = FrontendPluginServer.localLocks;
        const previous = queue.get(storeKey) ?? Promise.resolve();
        const run = (async () => {
            await previous.catch(() => undefined);
            return task();
        })();
        queue.set(storeKey, run.catch(() => undefined));
        return run;
    }

    /**
     * The browser storage key of the store holding the given kind of values, or `undefined` if
     * there is nowhere to keep them, i.e. for workspace state while no workspace is open.
     */
    protected async getStoreKey(kind: PluginStorageKind): Promise<string | undefined> {
        if (!kind) {
            return GLOBAL_STORAGE_KEY;
        }
        // derived from the storage path so that the workspace state follows `ExtensionContext.storageUri`
        const storagePath = await this.pluginPathsService.getHostStoragePath(kind.workspace, kind.roots);
        return storagePath && `${WORKSPACE_STORAGE_KEY_PREFIX}${storagePath}`;
    }
}
