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

import { URI } from '@theia/core';
import { inject, injectable, interfaces } from '@theia/core/shared/inversify';
import { EncodingService } from '@theia/core/lib/common/encoding-service';
import { OPFSInitialization, DefaultOPFSInitialization } from '@theia/filesystem/lib/browser-only/opfs-filesystem-initialization';
import { OPFSFileSystemProvider } from '@theia/filesystem/lib/browser-only/opfs-filesystem-provider';
import { exerciseFiles } from './example-exercise';
import { solutionFiles } from './example-solution';

@injectable()
export class ExampleOPFSInitialization extends DefaultOPFSInitialization {

    @inject(EncodingService)
    protected encodingService: EncodingService;

    override getRootDirectory(): string {
        return '/theia/';
    }

    override async initializeFS(provider: OPFSFileSystemProvider): Promise<void> {
        await this.initializeDirectory(provider, '/exercise', exerciseFiles);
        await this.initializeDirectory(provider, '/solution', solutionFiles);
    }

    protected async initializeDirectory(provider: OPFSFileSystemProvider, directory: string, files: { name: string, content: string }[]): Promise<void> {
        const directoryUri = new URI(directory);
        // don't overwrite the user's changes on reload
        if (await provider.exists(directoryUri)) {
            return;
        }
        await provider.mkdir(directoryUri);
        for (const file of files) {
            await provider.writeFile(directoryUri.resolve(file.name), this.encodingService.encode(file.content).buffer, { create: true, overwrite: false });
        }
    }
}

export const bindOPFSInitialization = (bind: interfaces.Bind, rebind: interfaces.Rebind): void => {
    bind(ExampleOPFSInitialization).toSelf();
    rebind(OPFSInitialization).toService(ExampleOPFSInitialization);
};
