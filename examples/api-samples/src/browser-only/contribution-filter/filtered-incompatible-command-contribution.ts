// *****************************************************************************
// Copyright (C) 2021 STMicroelectronics and others.
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

import { ContributionFilterRegistry, FilterContribution, bindContribution } from '@theia/core/lib/common';
import { injectable, interfaces } from '@theia/core/shared/inversify';
import { SearchInWorkspaceFrontendContribution } from '@theia/search-in-workspace/lib/browser/search-in-workspace-frontend-contribution';
import { GitContribution } from '@theia/git/lib/browser/git-contribution';
import { ScmContribution } from '@theia/scm/lib/browser/scm-contribution';
import { TestViewContribution } from '@theia/test/lib/browser/view/test-view-contribution';
import { TestRunViewContribution } from '@theia/test/lib/browser/view/test-run-view-contribution';

@injectable()
export class FilterNonCompatibleBrowserOnlyContribution implements FilterContribution {
    registerContributionFilters(registry: ContributionFilterRegistry): void {
        registry.addFilters('*', [
            // filter a contribution based on its class type
            contrib => !(contrib instanceof SearchInWorkspaceFrontendContribution ||
                contrib instanceof GitContribution ||
                contrib instanceof ScmContribution ||
                contrib instanceof TestViewContribution ||
                contrib instanceof TestRunViewContribution
            )
        ]);
    }
}

export function bindSampleFilteredCommandContribution(bind: interfaces.Bind): void {
    bind(FilterNonCompatibleBrowserOnlyContribution).toSelf().inSingletonScope();
    bindContribution(bind, FilterNonCompatibleBrowserOnlyContribution, [FilterContribution]);
}
