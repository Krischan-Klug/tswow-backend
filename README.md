# TSWoW / TrinityCore Auth Backend (Node + Express + TypeScript + MySQL)

A small, modular TypeScript backend for account registration (SRP6) with room to grow (login, realms, characters, etc.).
The frontend (Next.js or React) should call this backend via a server-side proxy to avoid mixed content.

---

## Features

- TypeScript with strict typing
- Modular plugin system with auto-discovery and `plugins.json`
- Core plugin centralizes global middleware and shared utils/DB
- Endpoints: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /realm/info`
- SRP6 (TrinityCore-compatible) account verification
- MySQL connection pools (auth + realm-specific pools)
- Security: helmet, compression, CORS, express-rate-limit (global and per-route)

---

## Concept

### Architecture (simple)

```
[Browser Form]
   -> (POST /api/register)
[Next.js API Route — Proxy]
   -> (server-side fetch)
[Backend /auth/register]
   ->
[Controller] -> [Service] -> [DB Pool] -> [MySQL]

 Security: helmet, cors, compression, rate-limits
```

### Plugin System

Plugins live under `src/plugins/`. On first run the server scans this directory and creates a `plugins.json`
file listing all discovered modules. With the Core plugin, a typical file looks like:

```json
{
  "core": true,
  "auth": true,
  "realm": true
}
```

Dependencies are declared per plugin via `deps` in each `index.ts` (e.g., `auth` and `realm` depend on `core`).
The loader performs a topological sort so dependencies are initialized first. Set any entry to `false` to disable
a plugin for a given environment. The file is `.gitignore`d so each environment can toggle modules independently.

### Core Plugin

The `core` plugin sits at the base of the dependency graph and initializes global middleware in its `init(app)`.
It also provides shared building blocks (e.g., auth guard, rate limiters, DB pools, SRP utilities) via a stable entry
point so feature plugins don't need to know about app-level paths.

Intended usage:

- Feature plugins declare `deps: ["core"]` to ensure core runs first.
- Feature plugins import what they need from `plugin-core`.
- Keep cross-cutting concerns in `core` so feature plugins stay slim and focused on their domain.

---

## Setup

### Requirements

- Node.js 18+ (recommend 20+)
- MySQL/MariaDB with TrinityCore/TSWoW auth schema

### Backend Setup

1. Install dependencies

```bash
npm i
```

2. Environment variables (`.env` — use `.env.example` as a template)

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=1d
```

3. Database configuration (`db.json` — copy from `db.example.json`)

```json
{
  "auth": {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "tswow",
    "password": "password",
    "database": "auth"
  },
  "realms": [
    {
      "id": 1,
      "host": "127.0.0.1",
      "port": 3306,
      "user": "tswow",
      "password": "password",
      "worldDest": "world.dest",
      "worldSource": "world.source",
      "characters": "characters"
    }
  ]
}
```

4. Run

```bash
npm run dev     # watch mode
# or
npm run build && npm start
```

---

## Frontend (Next.js) — Proxy Setup

Why: Your site runs on HTTPS, but the backend might be HTTP. Browsers block HTTPS → HTTP calls (mixed content).
Solution: Call your own Next.js API route (HTTPS), which server-side calls the backend.

1. API Route (Proxy): `pages/api/register.ts`

```ts
import type { NextApiRequest, NextApiResponse } from "next";

// Server-side proxy — avoids mixed content
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const upstream =
    process.env.BACKEND_URL || "http://YOUR-SERVER-IP:3001/auth/register";

  try {
    const r = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json(data);
  } catch {
    return res.status(502).json({ error: "Upstream not reachable" });
  }
}
```

Optional in your Next.js project: `.env.local`

```env
BACKEND_URL=http://YOUR-SERVER-IP:3001/auth/register
```

2. Frontend page (example submit)

```js
await fetch("/api/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password, email }), // email can be empty
});
```

Note: Do not call `http://IP:3001` directly from the browser on an HTTPS page.

---

## Current API

These endpoints are provided by plugins and are only available when their respective modules are enabled.

### POST /auth/register

Create an account with SRP6 in the `auth.account` table.

Body

```json
{ "username": "Foo", "password": "Bar", "email": "foo@bar.tld" }
```

Responses

- 201 { "message": "account created" }
- 409 { "error": "username already exists" }
- 400/500 on validation/internal errors

### POST /auth/login

Verify a user's password using SRP6 (`salt` + `verifier`).

Body

```json
{ "username": "Foo", "password": "Bar" }
```

Responses

- 200 { "token": "<JWT>", "account": { "id": 1, "username": "Foo", "email": "" } }
- 401 { "error": "invalid credentials" }
- 400/500 on validation/internal errors

### GET /auth/me

Returns the current user's account based on the `Authorization: Bearer <JWT>` header.

Responses

- 200 { "account": { "id": 1, "username": "Foo", "email": "", "SecurityLevel": 0 } }
- 401 { "error": "invalid token" }
- 404 { "error": "not found" }

### POST /realm/info

Retrieve a realm's basic information from `realmlist`.

Body

```json
{ "id": 1 }
```

Responses

- 200 { "name": "My Realm", "address": "127.0.0.1:8085", "population": 1 }
- 404 { "error": "no realm found" }
- 400/500 on validation/internal errors

---

## Security Notes

- helmet for secure HTTP headers (global via Core plugin)
- compression for faster responses (global)
- CORS: if `FRONTEND_ORIGIN` is set, only that origin is allowed; otherwise open
- express-rate-limit: global limit plus dedicated limits for register/login (IPv6-safe keys)
- trust proxy is set to `1` for operation behind reverse proxies / Cloudflare / IIS
- No mixed content thanks to the Next.js proxy

Optional hardening (not enabled here):

- Add a shared x-api-key between Next.js proxy and backend.
- Put the backend behind HTTPS (Caddy/IIS/Nginx) if you prefer TLS end-to-end.

---

## Troubleshooting

- Mixed Content: Use `/api/register` (proxy) instead of calling `http://...` from the browser.
- IPv6 warning in rate-limit: Use `ipKeyGenerator(req)` (already implemented).
- ER_BAD_FIELD_ERROR (1054): Ensure `account` uses `salt` + `verifier` (not legacy `sha_pass_hash`).
- Port unreachable: Open TCP port in your firewall if needed (e.g., 3001).

---

## Writing Plugins

This repository is designed to make adding your own features easy. A plugin is a small folder under `src/plugins/` that exports a `ModulePlugin` with a unique `name`, optional `deps`, and an `init(app)` that mounts routes or does setup work.

- Location: create `src/plugins/hello/`
- Identity: export `default` with `name: "hello"`
- Order: declare `deps: ["core"]` if you rely on shared middleware/utils/DB
- Routing: mount an Express `Router` inside `init(app)`
- Discovery: the loader auto-detects `hello` and adds it to `plugins.json` (default `true`)

Minimal example:

`src/plugins/hello/index.ts`

```ts
import type { ModulePlugin } from "../types.js";
import routes from "./routes.js";

const HelloPlugin: ModulePlugin = {
  name: "hello",
  deps: ["core"],
  init(app) {
    app.use("/hello", routes);
  },
};

export default HelloPlugin;
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

Key rules and tips:

- Unique `name`: must not collide with other plugins.
- Use Core: import shared pieces from `../core/index.js` to avoid hardcoded app paths.
- Add `deps`: set `deps: ["core"]` (and any other plugin you depend on) so the loader initializes in the right order.
- Imports with extension: keep the `.js` extension in imports (NodeNext resolution with TypeScript).
- Enable/disable: toggle `plugins.json` to switch your plugin on or off per environment.
