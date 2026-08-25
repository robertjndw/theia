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
import { injectable } from '@theia/core/shared/inversify';
import { PluginDeployOptions, PluginIdentifiers, PluginServer, PluginStorageKind, PluginType } from '../../common';
import { KeysToAnyValues, KeysToKeysToAnyValue } from '../../common/types';

/**
 * Plugins of a browser-only application are deployed at build time, so they cannot be
 * installed, uninstalled, enabled or disabled at runtime. The queries report an empty
 * result rather than failing, so that callers such as the plugin view can render.
 */
@injectable()
export class FrontendPluginServer implements PluginServer {
    install(pluginEntry: string, type?: PluginType, options?: PluginDeployOptions): Promise<void> {
        throw new Error('Installing plugins is not supported in a browser-only application.');
    }

    uninstall(pluginId: PluginIdentifiers.VersionedId): Promise<void> {
        throw new Error('Uninstalling plugins is not supported in a browser-only application.');
    }

    enablePlugin(pluginId: PluginIdentifiers.UnversionedId): Promise<boolean> {
        throw new Error('Enabling plugins is not supported in a browser-only application.');
    }

    disablePlugin(pluginId: PluginIdentifiers.UnversionedId): Promise<boolean> {
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
        return false;
    }

    async getStorageValue(key: string, kind: PluginStorageKind): Promise<KeysToAnyValues> {
        return {};
    }

    async getAllStorageValues(kind: PluginStorageKind): Promise<KeysToKeysToAnyValue> {
        return {};
    }
}
