# TSWoW / TrinityCore Auth Backend (Node + Express)

A small, modular backend for **account registration** (SRP6) with room to grow (login, characters, etc.).  
The frontend (Next.js) calls this backend **via a server-side proxy** to avoid mixed content.

---

## Features

- `POST /auth/register` — creates accounts in the **auth** DB using **SRP6** (`salt` + `verifier`, both `BINARY(32)`)
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
├─ .env                # real secrets (NOT in git)
├─ .env.example        # template (IN git)
├─ .gitignore
├─ index.js            # server entry (loads env, boots app)
└─ src/
   ├─ app.js           # builds Express app (middlewares + routes)
   ├─ routes/
   │  └─ auth.routes.js
   ├─ controllers/
   │  └─ auth.controller.js
   ├─ services/
   │  └─ auth.service.js
   ├─ db/
   │  └─ pool.js       # mysql2 pools (auth; later characters/world)
   ├─ middleware/
   │  ├─ rateLimiters.js
   │  └─ error.js      # (optional)
   └─ utils/
      └─ srp.js
```

**Rule of thumb:** Routes → Controllers → Services → DB Pools. (Not the other way around.)

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
DB_NAME=auth

# (optional later)
# DB_CHAR_DB=characters
```

3. **Run**

```bash
npm run dev   # dev with nodemon
# or
npm start
```

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

### 1) API Route (Proxy): `pages/api/register.js`

```js
// Server-side proxy → avoids mixed content
export default async function handler(req, res) {
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
