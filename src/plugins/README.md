# Plugin Development

This document explains how to build and consume plugins in this codebase. It covers discovery, configuration, auto-scaffolding, and the public API conventions that keep imports simple and stable.

## Overview

- Plugins live under `src/plugins/<name>/` and are auto-discovered on startup.
- The loader maintains a `plugins.config.json` file with per-plugin enable/disable flags and optional settings.
- Every plugin must export a `ModulePlugin` (the default export) with `name`, `version`, optional `description`, dependency list, and lifecycle hooks.
- The `core` plugin is mandatory; the server refuses to start if it is missing, disabled, or unresolved.
- Run `npm run check:plugins` to audit dependency issues and see which plugins are enabled.

## Configuration (`plugins.config.json`)

On boot the loader synchronises `plugins.config.json` alongside new or removed plugins, adding entries like:

```json
{
  "core": { "enabled": true, "settings": {} },
  "auth": { "enabled": true, "settings": {} }
}
```

This file is ignored by git so every environment can tailor its plugin list. Toggle `enabled` to opt a module in or out locally. The `settings` bag is passed to the plugin as part of the lifecycle context for custom configuration.

## Auto-scaffolding during `npm run dev`

When the dev script is running the loader watches `src/plugins`. Creating a new folder automatically generates a starter plugin (`index.ts`, `routes.ts`, `controller.ts`, `service.ts`) wired to `core` with placeholder handlers. To opt in outside of `npm run dev`, set `TSWOW_PLUGIN_AUTO_SCAFFOLD=true` in your shell.

## Module Structure

A minimal plugin looks like the following:

`src/plugins/hello/index.ts`

```ts
import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const HelloPlugin: ModulePlugin = {
  name: "hello",
  version: "1.0.0",
  description: "Example greeting feature.",
  deps: [{ name: "core", range: "^1.0.0" }],
  async init(app, _context) {
    app.use("/hello", routes);
  },
};

export default HelloPlugin;

// Public API (barrel)
export * from "./service.js";
```

`src/plugins/hello/routes.ts`

```ts
import { Router } from "express";
import { requireAuth } from "plugin-core";
import { hello } from "./controller.js";

const router = Router();
router.get("/", requireAuth, hello);
export default router;
```

`src/plugins/hello/controller.ts`

```ts
import type { Response } from "express";
import type { AuthRequest } from "plugin-core";
import { getHelloData } from "./service.js";

export async function hello(req: AuthRequest, res: Response) {
  const payload = await getHelloData(req.user?.id ?? null);
  return res.json(payload);
}
```

`src/plugins/hello/service.ts`

```ts
export interface HelloData {
  message: string;
  accountId: number | null;
}

export async function getHelloData(accountId: number | null): Promise<HelloData> {
  return {
    message: "Hello from hello!",
    accountId,
  };
}
```

## Path Aliases & Imports

- The TypeScript config maps `plugin-*` to `src/plugins/*/index.ts` (and allows subpaths):
  - `plugin-<name>` ? `src/plugins/<name>/index.ts`
  - `plugin-<name>/...` ? files within `src/plugins/<name>`
- This project uses ESM (`"module": "NodeNext"`). For relative imports within a plugin, include `.js` extensions (e.g., `./routes.js`). Aliased imports like `plugin-auth` are rewritten during build by `tsc-alias`.

Example imports:

```ts
import { requireAuth } from "plugin-core";
import { issueJwt } from "plugin-auth";
import { getRealmById } from "plugin-realm";
```

## Public API & Import Conventions

- Expose your plugin's public API from its `index.ts` file.
- Re-export services/types intended for other plugins via `export * from "./service.js";`.
- Other plugins should import only via the alias `plugin-<name>` (avoid deep imports like `plugin-<name>/service.js`).
- Internal files can be reorganized freely as long as the public API remains stable.

## Tips

- Dependency names in `deps` must match the `name` of the target plugin; include a semver `range` when a specific version is required.
- Keep the folder name and `ModulePlugin.name` aligned for clean aliasing.
- Use `npm run check:plugins` during development/CI to surface missing dependencies or disabled requirements early.
- Need to bootstrap quickly? Create a folder while `npm run dev` is running and let the watcher scaffold the rest.
