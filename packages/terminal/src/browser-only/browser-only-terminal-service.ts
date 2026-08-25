// *****************************************************************************
// Copyright (C) 2024 robertjndw
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

import { injectable } from '@theia/core/shared/inversify';
import { TerminalService } from '../browser/base/terminal-service';
import { Event } from '@theia/core';
import { WidgetOpenerOptions } from '@theia/core/lib/browser';
import { TerminalWidgetOptions, TerminalWidget } from '../browser/base/terminal-widget';

/**
 * A browser-only application has no backend to run a shell in, so it can't open terminals. The
 * remaining queries just report an empty result instead of failing, so callers like the plugin
 * host - which asks for the default shell on startup - keep working.
 */
@injectable()
export class BrowserOnlyTerminalService implements TerminalService {
    readonly onDidCreateTerminal: Event<TerminalWidget> = Event.None;
    readonly onDidChangeCurrentTerminal: Event<TerminalWidget | undefined> = Event.None;

    get currentTerminal(): TerminalWidget | undefined {
        return undefined;
    }

    get lastUsedTerminal(): TerminalWidget | undefined {
        return undefined;
    }

    async newTerminal(options: TerminalWidgetOptions): Promise<TerminalWidget> {
        throw new Error('Terminals are not supported in a browser-only application.');
    }

    async open(terminal: TerminalWidget, options?: WidgetOpenerOptions): Promise<void> { }

    get all(): TerminalWidget[] {
        return [];
    }

    getById(id: string): TerminalWidget | undefined {
        return undefined;
    }

    getByTerminalId(terminalId: number): TerminalWidget | undefined {
        return undefined;
    }

    async getDefaultShell(): Promise<string> {
        return '';
    }
}
