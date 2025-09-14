# Plugin Development

This document explains how to build and consume plugins in this codebase. It covers discovery, path aliases, creating a plugin, and the public API conventions that keep imports simple and stable.

## Overview

- Plugins live under `src/plugins/<name>/` and are auto-discovered on startup.
- The loader writes/maintains a `plugins.json` file listing enabled plugins per environment.
- Each plugin exports a `default` object (a `ModulePlugin`) with a unique `name`, optional `deps`, and an `init(app)` function to register routes and setup.

## Path Aliases & ESM

- The TypeScript config maps `plugin-*` to `src/plugins/*/index.ts` (and also allows subpaths):
  - `plugin-<name>` → `src/plugins/<name>/index.ts`
  - `plugin-<name>/...` → files within `src/plugins/<name>`
- This project uses ESM (`"module": "NodeNext"`). For relative imports within a plugin, include `.js` extensions (e.g., `./routes.js`). Aliased imports like `plugin-auth` do not require extensions and are rewritten during build by `tsc-alias`.

Example imports:

```ts
import { requireAuth } from "plugin-core";
import { issueJwt } from "plugin-auth";
import { getRealmById } from "plugin-realm";
```

## Creating a Plugin

This repository is designed to make adding your own features easy. A plugin is a small folder under `src/plugins/` that exports a `ModulePlugin` with a unique `name`, optional `deps`, and an `init(app)` that mounts routes or does setup work.

- Location: create `src/plugins/hello/`
- Identity: export `default` with `name: "hello"` (keep folder name and `name` aligned)
- Order: declare `deps: ["core"]` if you rely on shared middleware/utils/DB
- Routing: mount an Express `Router` inside `init(app)`
- Discovery: the loader auto-detects `hello` and adds it to `plugins.json` (default `true`)
- Public API: re-export your service/types from `index.ts` to keep imports stable

Minimal example:

`src/plugins/hello/index.ts`

```ts
import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

export const HelloPlugin: ModulePlugin = {
  name: "hello",
  deps: ["core"],
  init(app) {
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

export function hello(req: AuthRequest, res: Response) {
  return res.json({ message: `Hello, ${req.user?.username || "guest"}!` });
}
```

Optional service with shared Core utilities:

```ts
// src/plugins/hello/service.ts
import { authPool } from "plugin-core";

export async function getAccountCount(): Promise<number> {
  const [rows] = await authPool.execute("SELECT COUNT(*) AS c FROM account");
  return Number((rows as any[])[0].c || 0);
}
```

## Public API & Import Conventions

- Expose your plugin’s public API from its `index.ts` file.
- Use `export * from "./service.js";` in the plugin index to re-export services and types intended for other plugins.
- Other plugins should import only via the alias `plugin-<name>` (avoid deep imports like `plugin-<name>/service.js`).
- Internal files can be reorganized freely as long as the public API remains stable through the index barrel.

Do/Don't:

- Do: `export * from "./service.js";` in the plugin’s `index.ts`.
- Do: Import from other plugins via `plugin-foo`.
- Don't: `import { getFoo } from "plugin-foo/service.js";` (avoid deep imports).

## Tips

- Dependency names in `deps` must match the `name` of the target plugin.
- The plugin folder name should match the plugin `name` for cleaner aliases.
- Toggle plugins per environment via `plugins.json`.

