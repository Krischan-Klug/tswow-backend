# TSWoW Plugin Backend (Node + Express + TypeScript + MySQL)

A modular, extensible backend with a plugin system for TSWoW/TrinityCore — authentication, realms, characters, and optional features (e.g., Casino) as cleanly separated modules.

---

## Features

- TypeScript with strict typing
- Plugin system: auto-discovery, per-plugin config, dev-time auto scaffolding
- `core` plugin centralizes middleware, DB pools, auth (JWT) and utilities
- SRP6 (TrinityCore-compatible) account verification
- MySQL connection pools (auth + realm-specific pools)
- Security: helmet, compression, CORS, express-rate-limit (global and per-route)

---

## Concept

### Architecture (simple)

```
[Browser / Frontend]
   -> (proxy/API call)
[Backend (Plugins)]
   ->
[Controller] -> [Service] -> [DB Pool] -> [MySQL]

 Security: helmet, cors, compression, rate-limits
```

---

## Setup

### Requirements

- Node.js 18+ (20+ recommended)
- MySQL/MariaDB with TrinityCore/TSWoW auth/realm schema

### Backend Setup

1. Install dependencies

```
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

```
npm run dev     # watch mode
# or
npm run build && npm start
```

---

## Plugin System

Plugins live under `src/plugins/`. On startup the loader auto-discovers all plugins and maintains `plugins.config.json` (git-ignored) with enable flags and optional settings per plugin.

Example:

```json
{
  "core": { "enabled": true, "settings": {} },
  "auth": { "enabled": true, "settings": {} }
}
```

Notes:

- Set `enabled: false` to disable a plugin locally.
- `settings` is a free-form bag for plugin-specific config and is passed to the plugin’s lifecycle context.

Each plugin exports a `ModulePlugin` from its `index.ts` with `name`, `version`, optional `description`, and `deps`. Version ranges (e.g., `{ name: "auth", range: "^1.0.0" }`) are validated and load order is topologically sorted. The `core` plugin is required; the server will not start without it.

During `npm run dev` the loader watches `src/plugins`. Creating a new folder auto-scaffolds a starter plugin (`index.ts`, `routes.ts`, `controller.ts`, `service.ts`). Outside of dev: set `TSWOW_PLUGIN_AUTO_SCAFFOLD=true` to enable the same behavior.

Inter-plugin imports:

- Alias per plugin: `plugin-<folder>` → `src/plugins/<folder>/index.ts`
- Subpaths: `plugin-<folder>/...` → files within the plugin
- Examples:
  - `import { requireAuth } from "plugin-core";`
  - `import { issueJwt } from "plugin-auth";`
  - Keep `.js` extension for relative imports (NodeNext ESM)

### Core Plugin

Initializes global middleware (`helmet`, `compression`, JSON body parsing, `cors`, rate limits), sets `trust proxy`, and exports shared building blocks (JWT auth guard, rate limiters, DB pools, SRP utilities).

Intended usage:

- Feature plugins declare `deps: ["core"]`.
- Import needed utilities from `plugin-core`.
- Keep cross-cutting concerns in `core` so feature plugins stay focused.

### Writing Plugins

See [Plugin Development](src/plugins/README.md).

---

## Frontend Project

This repository only covers the backend. For UI, flows, and proxy/HTTPS guidance, see the separate frontend project:

- See [TSWoW Frontend](https://github.com/Krischan-Klug/tswow-frontend).

---

## Current API

These endpoints are provided by plugins and only available when their respective modules are enabled. A basic health check is always present.

<details>
  <summary><strong>App</strong> (core application)</summary>

- GET <code>/health</code>
  - Health check for the backend.
  - Response: 200 <code>{ "ok": true }</code>

</details>

<details>
  <summary><strong>Auth Plugin</strong> (<code>/auth</code>)</summary>

- POST <code>/auth/register</code>

  - Create an account (SRP6) in <code>auth.account</code>.
  - Body: <code>{ "username": "Foo", "password": "Bar", "email": "foo@bar.tld" }</code>
  - Responses: 201 created; 409 username exists; 400/500 on errors

- POST <code>/auth/login</code>

  - Verify password via SRP6 (<code>salt</code> + <code>verifier</code>).
  - Body: <code>{ "username": "Foo", "password": "Bar" }</code>
  - Responses: 200 JWT + account; 401 invalid; 400/500 errors

- GET <code>/auth/me</code>
  - Return current user from <code>Authorization: Bearer &lt;JWT&gt;</code>.
  - Responses: 200 account; 401 invalid token; 404 not found

</details>

<details>
  <summary><strong>Realm Plugin</strong> (<code>/realm</code>)</summary>

- GET <code>/realm</code>
  - List all realms from <code>realmlist</code> including current online player count per realm.
  - Responses: 200 <code>{ "realms": [{ id, name, address, port, population }] }</code>; 500 on errors

</details>

<details>
  <summary><strong>Character Plugin</strong> (<code>/character</code>)</summary>

- POST <code>/character</code>
  - List characters for the authenticated account, grouped by realm.
  - Auth: required (<code>Bearer &lt;JWT&gt;</code>)
  - Body: <code>{}</code>
  - Response: 200 list; 401 unauthorized; 500 errors

</details>

<details>
  <summary><strong>Casino Plugin</strong> (<code>/casino</code>)</summary>

- GET <code>/casino/characters</code>

  - List playable characters with balances per realm.
  - Auth: required
  - Response: 200 list; 401 unauthorized; 4xx/5xx on errors

- POST <code>/casino/coin-flip</code>
  - Place a coin-flip wager. Atomic balance update in characters DB.
  - Auth: required
  - Body: <code>{ "realmId": 1, "characterGuid": 123, "wagerCopper": 100, "choice": "heads" }</code>
  - Notes: <code>choice</code> also accepts <code>kopf</code>/<code>zahl</code> (case-insensitive); <code>wagerCopper</code> must be a positive integer.
  - Response: 200 result; Errors: 401 INVALID_ACCOUNT; 400 INVALID_WAGER/INSUFFICIENT_FUNDS/invalid choice; 404 CHARACTER_NOT_FOUND; 500 TRANSACTION_FAILED

</details>

<details>
  <summary><strong>Dev Plugin</strong> (<code>/dev</code>)</summary>

- GET <code>/dev</code>
  - Diagnostics/dev route
  - Response: 200 <code>{ "message": "DEV ACCESSED" }</code>

</details>

---

## Security Notes

- helmet for secure HTTP headers (global, via `core`)
- compression for faster responses (global)
- CORS: if `FRONTEND_ORIGIN` is set, only that origin is allowed; otherwise open
- express-rate-limit: global plus dedicated limits for register/login (IPv6-safe keys)
- `trust proxy` set to `1` for operation behind reverse proxies / Cloudflare / IIS

Optional hardening (not enabled by default):

- Use a shared `x-api-key` between frontend proxy and backend
- Run the backend behind HTTPS (Caddy/IIS/Nginx) for end-to-end TLS

---

## Troubleshooting

- Mixed Content: see the frontend project for proxy/HTTPS details
- IPv6 warning in rate-limit: use `ipKeyGenerator(req)` (already implemented)
- ER_BAD_FIELD_ERROR (1054): make sure `account` uses `salt` + `verifier` (not legacy `sha_pass_hash`)
- Port unreachable: open the TCP port in your firewall (e.g., 3001)
