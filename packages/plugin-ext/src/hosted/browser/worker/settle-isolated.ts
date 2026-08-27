// *****************************************************************************
// Copyright (C) 2026 EclipseSource and others.
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

/**
 * Runs `prepare` for every item concurrently, preserving the original order in the result. An
 * item whose `prepare` rejects is reported via `onError` and left out of the result rather than
 * failing the whole batch - so, for example, one plugin whose manifest can't be loaded (a 404 on
 * `package.json`) can't prevent every other plugin from loading.
 */
export async function settleIsolated<T, R>(
    items: readonly T[],
    prepare: (item: T) => Promise<R>,
    onError: (item: T, error: unknown) => void
): Promise<R[]> {
    // `R` is unconstrained, so TS can't rule out it being itself thenable; the cast tells it what
    // we already know - `prepare` resolves to a plain `R`, never something requiring a further await.
    const settled = await Promise.all(items.map(async (item): Promise<R | undefined> => {
        try {
            return await prepare(item);
        } catch (error) {
            onError(item, error);
            return undefined;
        }
    })) as Array<R | undefined>;
    return settled.filter((value): value is R => value !== undefined);
}
