# TSWoW / TrinityCore Auth Backend (Node + Express + TypeScript + MySQL)

A small, modular TypeScript backend for account registration (SRP6) with room to grow (login, realms, characters, etc.).
The frontend (Next.js or React) should call this backend via a server-side proxy to avoid mixed content.

---

## Features

- TypeScript with strict typing
- Modular plugin system with auto-discovery, per-plugin config, and dev-time scaffolding
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

Plugins live under `src/plugins/`. On startup the loader discovers every folder and writes/maintains a `plugins.config.json` file with per-plugin flags:

```json
{
  "core": { "enabled": true, "settings": {} },
  "auth": { "enabled": true, "settings": {} }
}
```

Treat this file like environment state: it is regenerated when new plugins appear and should stay out of source control (already listed in `.gitignore`). Set `enabled` to `false` to skip a plugin locally or extend `settings` with plugin-specific configuration.

Each plugin exposes a `ModulePlugin` from its `index.ts` with a unique `name`, a semantic `version`, optional `description`, and dependency list. Dependencies are version-aware (`{ name: "auth", range: "^1.0.0" }`) and the loader topologically sorts modules. The `core` plugin is mandatory; the server refuses to start if it is missing, disabled, or has unresolved issues.

During `npm run dev` the loader watches the `src/plugins` directory. Creating a new folder auto-scaffolds a starter plugin (index/routes/controller/service) that already depends on `core` and exports placeholder handlers. Set `TSWOW_PLUGIN_AUTO_SCAFFOLD=true` to enable the same behaviour outside the dev script if needed.

Inter-plugin imports:

- Aliases are available for every plugin: `plugin-<folder>` maps to `src/plugins/<folder>/index.ts`.
- Subpaths are supported: `plugin-<folder>/...` maps to files under that plugin.
- Examples:
  - `import { requireAuth } from "plugin-core";`
  - `import { issueJwt } from "plugin-auth";`
  - Keep the `.js` extension when importing non-index files (NodeNext ESM).
\n\n### Core Plugin

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

See [Plugin Development](src/plugins/README.md).




