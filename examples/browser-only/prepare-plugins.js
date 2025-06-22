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

const { promisify } = require('util');
const glob = promisify(require('glob'));
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { Configuration } = require('tslint');

async function run() {
    // Resolve the `package.json` at the current working directory.
    const pck = JSON.parse(await fsp.readFile(path.resolve('package.json'), 'utf8'));

    // Resolve the directory for which to download the plugins.
    const pluginsDir = pck.theiaPluginsDir || 'extension';

    // Find all `plugin/extension/*` directories.
    const plugins = await glob(`${pluginsDir}/*/extension`);

    const deployedPlugins = [];

    for (const pluginExtensionPath of plugins) {
        // Extract the plugin name from the parent folder of the extension.
        const pluginName = path.basename(path.dirname(pluginExtensionPath)).replace(/[.\-]/g, '_');
        const targetDir = path.join('lib', 'frontend', 'hostedPlugin', pluginName);

        // When the directory exists, skip it
        if (fs.existsSync(targetDir)) {
            console.log(`Plugin ${pluginName} already prepared. Skipping.`);
        } else {
            // Ensure the target directory exists when not already present.
            await fsp.mkdir(targetDir, { recursive: true });

            // Copy the content of the `extension` folder to the target directory.
            const files = await glob(`${pluginExtensionPath}/**/*`, { nodir: true });
            for (const file of files) {
                const relativePath = path.relative(pluginExtensionPath, file);
                const target = path.join(targetDir, relativePath);

                // Ensure the target directory structure exists.
                await fsp.mkdir(path.dirname(target), { recursive: true });

                // Copy the file.
                await fsp.copyFile(file, target);
            }
        }

        // Create DeployedPlugin object
        const deployedPlugin = await createDeployedPlugin(pluginExtensionPath, pluginName, targetDir);
        if (deployedPlugin) {
            deployedPlugins.push(deployedPlugin);
        }
    }

    // Generate the plugin registry file
    await generatePluginRegistry(deployedPlugins);
}

async function createDeployedPlugin(extensionPath, pluginName, targetDir) {
    try {
        // Try to read package.json from the extension
        const packageJsonPath = path.join(extensionPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            console.warn(`No package.json found for plugin ${pluginName} at ${packageJsonPath}. Skipping.`);
            return null;
        }
        let packageJson = {};

        if (fs.existsSync(packageJsonPath)) {
            packageJson = JSON.parse(await fsp.readFile(packageJsonPath, 'utf8'));
        }

        const pluginId = `${packageJson.publisher || 'unknown'}_${packageJson.name || pluginName}`;

        return {
            type: 0, // PluginType.System
            metadata: {
                host: 'main',
                model: {
                    id: pluginId,
                    name: packageJson.name || pluginName,
                    publisher: packageJson.publisher || 'unknown',
                    version: packageJson.version || '1.0.0',
                    displayName: packageJson.displayName || packageJson.name || pluginName,
                    description: packageJson.description || '',
                    engine: {
                        type: 'vscode',
                        version: packageJson.engines?.vscode || '*'
                    },
                    entryPoint: {
                        frontend: packageJson.browser || undefined,
                    },
                    packageUri: `hostedPlugin/${pluginName}`,
                    packagePath: targetDir,
                    iconUrl: packageJson.icon ? `hostedPlugin/${pluginName}/${packageJson.icon}` : undefined,
                    readmeUrl: packageJson.readme ? `hostedPlugin/${pluginName}/.%2FREADME.md` : undefined,
                    licenseUrl: packageJson.license ? `hostedPlugin/${pluginName}/.%2FLICENSE` : undefined,
                    l10n: packageJson.l10n
                },
                lifecycle: {
                    startMethod: 'activate',
                    stopMethod: 'deactivate',
                    frontendModuleName: pluginName,
                    frontendInitPath: 'plugin-vscode-init-fe.js',
                },
                outOfSync: false
            },
            contributes: {
                activationEvents: packageJson.activationEvents || [],
                authentication: packageJson.contributes?.authentication || [],
                configuration: [packageJson.contributes?.configuration] || [],
                configurationDefaults: packageJson.contributes?.configurationDefaults || {},
                languages: packageJson.contributes?.languages || [],
                grammars: packageJson.contributes?.grammars || [],
                customEditors: packageJson.contributes?.customEditors || [],
                viewsContainers: packageJson.contributes?.viewsContainers || {},
                views: packageJson.contributes?.views || {},
                viewsWelcome: packageJson.contributes?.viewsWelcome || [],
                commands: packageJson.contributes?.commands || [],
                menus: packageJson.contributes?.menus || {},
                submenus: packageJson.contributes?.submenus || [],
                keybindings: packageJson.contributes?.keybindings || [],
                debuggers: packageJson.contributes?.debuggers || [],
                snippets: packageJson.contributes?.snippets || [],
                themes: packageJson.contributes?.themes || [],
                iconThemes: packageJson.contributes?.iconThemes || [],
                icons: packageJson.contributes?.icons || [],
                colors: packageJson.contributes?.colors || [],
                breakpoints: packageJson.contributes?.breakpoints || [],
                taskDefinitions: packageJson.contributes?.taskDefinitions || [],
                problemPatterns: packageJson.contributes?.problemPatterns || [],
                problemMatchers: packageJson.contributes?.problemMatchers || [],
                resourceLabelFormatters: packageJson.contributes?.resourceLabelFormatters || [],
                localizations: packageJson.contributes?.localizations || [],
                terminalProfiles: packageJson.contributes?.terminalProfiles || [],
                notebooks: packageJson.contributes?.notebooks || [],
                notebookRenderer: packageJson.contributes?.notebookRenderer || [],
                notebookPreload: packageJson.contributes?.notebookPreload || [],
            }
        };
    } catch (error) {
        console.warn(`Could not create DeployedPlugin for ${pluginName}:`, error.message);
        return null;
    }
}

async function generatePluginRegistry(deployedPlugins) {
    const outputPath = path.join('.', 'static-plugin-metadata.ts');

    // Ensure output directory exists
    await fsp.mkdir(path.dirname(outputPath), { recursive: true });

    const pluginDefinitions = deployedPlugins.map(plugin => `
    {
        type: ${plugin.type},
        metadata: {
            host: '${plugin.metadata.host}',
            model: {
                id: '${plugin.metadata.model.id}',
                name: '${plugin.metadata.model.name}',
                publisher: '${plugin.metadata.model.publisher}',
                version: '${plugin.metadata.model.version}',
                displayName: '${plugin.metadata.model.displayName}',
                description: '${plugin.metadata.model.description}',
                engine: {
                    type: '${plugin.metadata.model.engine.type}',
                    version: '${plugin.metadata.model.engine.version}'
                },
                entryPoint: {
                    frontend: ${plugin.metadata.model.entryPoint.frontend ? `'${plugin.metadata.model.entryPoint.frontend}'` : 'undefined'},
                    backend: ${plugin.metadata.model.entryPoint.backend ? `'${plugin.metadata.model.entryPoint.backend}'` : 'undefined'}
                },
                iconUrl: '${plugin.metadata.model.iconUrl}',
                readmeUrl: '${plugin.metadata.model.readmeUrl}',
                licenseUrl: '${plugin.metadata.model.licenseUrl}',
                packageUri: '${plugin.metadata.model.packageUri}',
                packagePath: '${plugin.metadata.model.packagePath}'${plugin.metadata.model.iconUrl ? `,                       
                l10n: '${plugin.metadata.model.l10n}'` : ''}
            },
            lifecycle: {
                startMethod: '${plugin.metadata.lifecycle.startMethod}',
                stopMethod: '${plugin.metadata.lifecycle.stopMethod}'${plugin.metadata.lifecycle.frontendModuleName ? `,\n                
                frontendModuleName: '${plugin.metadata.lifecycle.frontendModuleName}'` : ''}
            },
            outOfSync: ${plugin.metadata.outOfSync}
        }${plugin.contributes ? `,\n        contributes: ${JSON.stringify(plugin.contributes, null, 12)}` : ''}
    }`).join(',\n');

    const fileContent = `// *****************************************************************************
// This file is auto-generated by prepare-plugins.js
// Do not edit manually - your changes will be overwritten
// *****************************************************************************

import { DeployedPlugin } from '@theia/plugin-ext/lib/common/plugin-protocol';

export const staticMetadata: DeployedPlugin[] = [${pluginDefinitions}
];
`;

    await fsp.writeFile(outputPath, fileContent, 'utf8');
    console.log(`Generated plugin registry at: ${outputPath}`);
    console.log(`Registered ${deployedPlugins.length} plugins as DeployedPlugin objects`);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
