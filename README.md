# TSWoW / TrinityCore Auth Backend (Node + Express + TypeScript)

A small, modular **TypeScript** backend for **account registration** (SRP6) with room to grow (login, characters, etc.).
The frontend (Next.js or React) calls this backend **via a server-side proxy** to avoid mixed content.

---

## Features

- Written in **TypeScript** with strict typing
- `POST /auth/register` — creates accounts in the **auth** DB using **SRP6** (`salt` + `verifier`, both `BINARY(32)`)
- `POST /realm/info` — fetches a realm's name, address and population from `realmlist` by ID
- Modular **plugin system** with auto-generated `plugins.json` to enable/disable features
- Express middleware: **helmet**, **compression**, **CORS**
- **Rate limits** per route (anti-spam) with IPv6-safe keys
- **MySQL connection pool**
- Works with a **Next.js API proxy** (`/api/register`) → no mixed content on HTTPS sites

---

## Architecture (simple)

```
[Browser Form]
   ↓ (POST /api/register)
[Next.js API Route — Proxy]
   ↓ (server-side fetch)
[Backend /auth/register]
   ↓
[Controller] → [Service] → [DB Pool] → [MySQL]
   ↑
 Security: helmet, cors, compression, rate-limits
```

---

## Folder Structure

```
your-backend/
├─ package.json
├─ tsconfig.json
├─ .env                # real secrets (NOT in git)
├─ .env.example        # template (IN git)
├─ .gitignore
├─ index.ts            # server entry (loads env, boots app)
├─ dist/               # compiled JavaScript output
└─ src/
   ├─ app.ts           # builds Express app (middlewares + plugins)
   ├─ plugins/         # feature modules
   │  ├─ index.ts      # loads modules & generates plugins.json
   │  ├─ types.ts
   │  ├─ auth/
   │  │  ├─ index.ts
   │  │  ├─ controller.ts
   │  │  ├─ routes.ts
   │  │  └─ service.ts
   │  └─ realm/
   │     ├─ index.ts
   │     ├─ controller.ts
   │     ├─ routes.ts
   │     └─ service.ts
   ├─ db/
   │  └─ pool.ts       # mysql2 pools (auth; later characters/world)
   ├─ middleware/
   │  ├─ rateLimiters.ts
   │  └─ error.ts
   └─ utils/
      └─ srp.ts
```

**Rule of thumb:** Plugins → Routes → Controllers → Services → DB Pools. (Not the other way around.)

---

## Plugin Configuration

Plugins live under `src/plugins/`. On first run the server scans this directory and creates a `plugins.json`
file listing all discovered modules:

```json
{
  "auth": true,
  "realm": true
}
```

Set any entry to `false` to disable that plugin. The file is `.gitignore`d so each environment can toggle
modules independently.

---

## Requirements

- Node.js **18+** (recommend **20+**)
- MySQL/MariaDB with **TrinityCore/TSWoW auth** schema

---

## Backend Setup

1. **Install deps**

```bash
npm i

```

2. **Environment variables**

Create `.env` (use `.env.example` as a template):

```env
PORT=3001

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=tswow
DB_PASS=password
DB_AUTH_1=auth
DB_WORLD_D_1=default.dataset.world.dest
DB_WORLD_S_1=default.dataset.world.source
DB_CHARACTERS_1=default.realm.characters

# (optional later)
# DB_CHAR_DB=characters
```

3. **Run**

```bash
npm run dev      # dev with nodemon + ts-node
# or
npm start        # builds (tsc) and runs dist/
```

A `plugins.json` file will be generated on first run. Edit this file to enable or disable individual modules.

**Minimal Windows watchdog (optional):**

```bat
@echo off
cd /d "%~dp0"
:loop
npm start
echo Restarting in 3s...
timeout /t 3 >nul
goto loop
```

---

## Frontend (Next.js) — Proxy Setup

**Why:** Your site runs on HTTPS, but the backend might be HTTP. Browsers block HTTPS → HTTP calls (mixed content).  
**Solution:** Call your own Next.js API route (HTTPS), which server-side calls the backend.

### 1) API Route (Proxy): `pages/api/register.ts`

```ts
import type { NextApiRequest, NextApiResponse } from "next";

// Server-side proxy → avoids mixed content
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

### 2) Frontend page (example submit)

```js
await fetch("/api/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password, email }), // email can be empty
});
```

> **Do not** call `http://IP:3001` directly from the browser on an HTTPS page.

---

## Current API

These endpoints are provided by plugins and are only available when their respective modules are enabled.

### `POST /auth/register`

Create an account with SRP6 in the `auth.account` table.

**Body**

```json
{ "username": "Foo", "password": "Bar", "email": "foo@bar.tld" }
```

**Responses**

- `201 { "message": "account created" }`
- `409 { "error": "username already exists" }`
- `400/500` on validation/internal errors

### `POST /auth/login`

Verify a user's password using SRP6 (`salt` + `verifier`).

**Body**

```json
{ "username": "Foo", "password": "Bar" }
```

**Responses**

- `200 { "message": "login ok" }`
- `401 { "error": "invalid credentials" }`
- `400/500` on validation/internal errors

### `POST /realm/info`

Retrieve a realm's basic information from `realmlist`.

**Body**

```json
{ "id": 1 }
```

**Responses**

- `200 { "name": "My Realm", "address": "127.0.0.1:8085", "population": 1 }`
- `404 { "error": "no realm found" }`
- `400/500` on validation/internal errors

---

## Security Notes

- **helmet** for secure HTTP headers
- **compression** for faster responses
- **cors** currently open; restrict origins in prod if desired
- **express-rate-limit** per route (IPv6-safe `ipKeyGenerator`)
- **No mixed content** thanks to the Next.js proxy

Optional hardening (not enabled here):

- Add a shared **x-api-key** between Next.js proxy and backend.
- Put the backend behind HTTPS (Caddy/IIS/Nginx) if you prefer TLS end-to-end.

---

## Troubleshooting

- **Mixed Content**: Use `/api/register` (proxy) instead of calling `http://...` from the browser.
- **IPv6 warning in rate-limit**: Use `ipKeyGenerator(req)` (already implemented).
- **“bigint: Failed to load bindings…”**: harmless; `npm rebuild` can silence.
- **ER_BAD_FIELD_ERROR (1054)**: Ensure `account` uses `salt` + `verifier` (not legacy `sha_pass_hash`).
- **Port unreachable**: Open **TCP** port in Windows firewall if needed (e.g., 3001).
