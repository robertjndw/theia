## Browser-Only

### Static Extension Support

Theia Browser-Only supports statically configured extensions. Only the extensions that are bundled at build time are available in the browser; extensions cannot be installed, enabled or disabled at runtime.

When it comes to extension support, there are some restrictions to consider:
1. The extensions must be compatible to run in a browser environment. This means that ideally, the extension is already a web extension according to the [VS Code Web Extension API](https://code.visualstudio.com/api/extension-guides/web-extensions).
2. The extensions must not rely on Node.js APIs or other APIs that are not available in the browser.

#### Providing the extensions

There are two ways to retrieve extensions:
1. VSIX packages: Copy the `.vsix` files to the directory specified in the `package.json` file by the `theiaPluginsDir` property (e.g. `"theiaPluginsDir": "../../plugins"`).
2. Open VSX Link: Specify a list of `id:link` mappings in the `package.json` file by the `theiaPlugins` property (e.g. `"theiaPlugins": { "vscodevim.vim": "https://open-vsx.org/api/vscodevim/vim/1.29.0/file/vscodevim.vim-1.29.0.vsix" }`). Extensions can be found on the [Open VSX Registry](https://open-vsx.org/) by searching for the extension and copying the link linked to the Download button.
   When using the Theia CLI command `theia download:plugins`, the Theia CLI will download the `.vsix` files from the specified links and install them in the directory specified by the `theiaPluginsDir` property.

#### Building

Nothing else is required: `theia build` prepares the extensions for a browser-only application automatically. It unpacks every extension found in `theiaPluginsDir`, copies it into `lib/frontend/hostedPlugin/<pluginId>/`, and writes the normalized metadata of all extensions to `lib/frontend/hostedPlugin/list.json`.

The metadata is derived from each extension's `package.json` and follows the `DeployedPlugin` interface (see [`plugin-protocol.ts`](packages/plugin-ext/src/common/plugin-protocol.ts)). Contribution points, activation events, grammars, icons and localization are normalized at build time, so no manual work is needed.

At runtime the `frontendOnly` module of `@theia/plugin-ext` serves that list to the plugin system in place of the backend, which is what makes the extensions available in the browser.

To verify that the extensions were correctly packaged, check the `lib/frontend/hostedPlugin` directory after a build. It should contain one directory per extension plus the `list.json` file. The build also prints a summary of the prepared and skipped extensions.

#### Supplying the metadata manually

Adopters who cannot rely on the build-time preparation - for example when the extensions are hosted elsewhere and are not visible to the build - can bind `PluginLocalOptions` to provide the metadata themselves. When bound, it takes precedence over `list.json`:

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { PluginLocalOptions } from '@theia/plugin-ext/lib/hosted/browser-only/frontend-hosted-plugin-server';

export default new ContainerModule(bind => {
    bind(PluginLocalOptions).toConstantValue({
        pluginMetadata: [ /* DeployedPlugin[] */ ]
    });
});
```

The extension files themselves still have to be reachable under `hostedPlugin/<pluginId>/`, and the paths inside the metadata (`entryPoint`, `iconUrl`, `readmeUrl`, `licenseUrl`) have to match that layout.

#### What extensions can expect at runtime

- Extensions that only contribute to the backend are skipped at build time; the build summary lists them.
- `ExtensionContext.globalState` and `ExtensionContext.workspaceState` are kept in the browser storage of the current host, i.e. per browser and per deployment, and the workspace state is kept per workspace. They are subject to the browser's storage quota.
- `ExtensionContext.storageUri`, `globalStorageUri` and `logUri` point into the browser-local file system, below the same config directory the application itself uses. `storageUri` is `undefined` while no workspace is open, as it is with a backend.
- Installing, uninstalling, enabling and disabling extensions fails with an explanatory error, and the Extensions view lists no installed, uninstalled or disabled extensions. Change the set of extensions by rebuilding the application.
- There are no terminals, because there is no backend to run a shell in. Opening one fails with an explanatory error.
