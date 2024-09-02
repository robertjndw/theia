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
// *****************************************************************************

import type { BrowserFSFileSystemProvider } from './browserfs-filesystem-provider';
import { injectable } from '@theia/core/shared/inversify';
import { configure } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';

export const BrowserFSInitialization = Symbol('BrowserFSInitialization');
export interface BrowserFSInitialization {
    createMountableFileSystem(): Promise<void>
    initializeFS: (provider: BrowserFSFileSystemProvider) => Promise<void>;
}

@injectable()
export class DefaultBrowserFSInitialization implements BrowserFSInitialization {

    createMountableFileSystem(): Promise<void> {
        return configure({
            mounts: {
                '/home': IndexedDB,
            }
        });
    }

    async initializeFS(provider: BrowserFSFileSystemProvider): Promise<void> {

    }
}
