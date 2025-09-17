# TSWoW Plugin Backend (Node + Express + TypeScript + MySQL)

Modulares, erweiterbares Backend mit Plugin-System für TSWoW/TrinityCore – Authentifizierung, Realms, Charaktere und optionale Features (z. B. Casino) über klar abgegrenzte Module.

---

## Features

- TypeScript mit striktem Typing
- Plugin-System: Auto-Discovery, per-Plugin-Konfiguration, Dev-Auto-Scaffolding
- `core`-Plugin bündelt Middleware, DB-Pools, Auth (JWT) und Utilities
- SRP6 (TrinityCore-kompatibel) für Account-Verifikation
- MySQL Connection-Pools (Auth + realm-spezifische Pools)
- Security: helmet, compression, CORS, express-rate-limit (global und per-Route)

---

## Concept

### Architecture (simple)

```
[Browser / Frontend]
   -> (Proxy/API Call)
[Backend (Plugins)]
   ->
[Controller] -> [Service] -> [DB Pool] -> [MySQL]

 Security: helmet, cors, compression, rate-limits
```

---

## Setup

### Requirements

- Node.js 18+ (empfohlen 20+)
- MySQL/MariaDB mit TrinityCore/TSWoW Auth-/Realm-Schema

### Backend Setup

1. Dependencies installieren

```
npm i
```

2. Environment-Variablen (`.env` – Vorlage `.env.example`)

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=1d
```

3. Datenbank-Konfiguration (`db.json` – Vorlage `db.example.json`)

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

4. Starten

```
npm run dev     # watch mode
# oder
npm run build && npm start
```

---

## Plugin System

Plugins liegen unter `src/plugins/`. Beim Start werden alle Plugins automatisch entdeckt; die Datei `plugins.config.json` hält Enable-Flags und optionale Settings pro Plugin fest (liegt bereits in `.gitignore`).

Beispiel-Konfiguration:

```json
{
  "core": { "enabled": true, "settings": {} },
  "auth": { "enabled": true, "settings": {} }
}
```

Hinweise:

- `enabled:false` deaktiviert ein Plugin lokal.
- `settings` ist frei für plugin-spezifische Konfiguration.

Jedes Plugin exportiert ein `ModulePlugin` aus `index.ts` mit `name`, `version`, optionaler `description` und `deps`. Versionsbereiche (z. B. `{ name: "auth", range: "^1.0.0" }`) werden geprüft und die Lade-Reihenfolge wird topologisch bestimmt. Das `core`-Plugin ist Pflicht; ohne aktiviertes `core` startet der Server nicht.

Während `npm run dev` beobachtet der Loader `src/plugins`. Das Anlegen eines Ordners scaffoldet automatisch ein Start-Plugin (`index.ts`, `routes.ts`, `controller.ts`, `service.ts`). Außerhalb von `dev`: `TSWOW_PLUGIN_AUTO_SCAFFOLD=true` setzen.

Inter-Plugin-Imports:

- Alias je Plugin: `plugin-<folder>` → `src/plugins/<folder>/index.ts`
- Subpaths: `plugin-<folder>/...` → Dateien innerhalb des Plugins
- Beispiele:
  - `import { requireAuth } from "plugin-core";`
  - `import { issueJwt } from "plugin-auth";`
  - Bei relativen Imports `.js`-Endung beibehalten (NodeNext ESM)

### Core Plugin

Initialisiert globale Middleware (`helmet`, `compression`, `json`, `cors`, Rate-Limits), setzt `trust proxy` und exportiert gemeinsame Bausteine (Auth-Guard/JWT, Rate-Limiter, DB-Pools, SRP-Utilities). Feature-Plugins hängen sich daran auf.

Empfohlene Nutzung:

- Feature-Plugins deklarieren `deps: ["core"]`.
- Benötigte Utilities via `plugin-core` importieren.
- Querschnittsthemen in `core` halten – Feature-Plugins bleiben schlank.

### Writing Plugins

Siehe `src/plugins/README.md` für eine ausführliche Anleitung.

---

## Frontend

Das Frontend ist ein separates Projekt. Bitte siehe das TSWoW Frontend für Implementierungsdetails, UX sowie Proxy/HTTPS-Hinweise. So vermeiden wir doppelte Dokumentation.

---

## Current API

Diese Endpoints kommen von Plugins und sind nur verfügbar, wenn die jeweiligen Module aktiviert sind. Basis-Gesundheitscheck ist immer vorhanden.

### GET /health

Gesundheitscheck des Backends.

Response

- 200 `{ "ok": true }`

### POST /auth/register

Erstellt einen Account (SRP6) in der `auth.account` Tabelle.

Body

```json
{ "username": "Foo", "password": "Bar", "email": "foo@bar.tld" }
```

Responses

- 201 `{ "message": "account created" }`
- 409 `{ "error": "username already exists" }`
- 400/500 bei Validierungs-/internen Fehlern

### POST /auth/login

Passwortprüfung via SRP6 (`salt` + `verifier`).

Body

```json
{ "username": "Foo", "password": "Bar" }
```

Responses

- 200 `{ "token": "<JWT>", "account": { "id": 1, "username": "Foo", "email": "" } }`
- 401 `{ "error": "invalid credentials" }`
- 400/500 bei Validierungs-/internen Fehlern

### GET /auth/me

Liefert den aktuellen Account basierend auf `Authorization: Bearer <JWT>`.

Responses

- 200 `{ "account": { "id": 1, "username": "Foo", "email": "", "SecurityLevel": 0 } }`
- 401 `{ "error": "invalid token" }`
- 404 `{ "error": "not found" }`

### POST /realm/info

Liest Basisinfos eines Realms aus `realmlist` (plus Population aus Characters-DB).

Body

```json
{ "id": 1 }
```

Responses

- 200 `{ "name": "My Realm", "address": "127.0.0.1:8085", "population": 1 }`
- 404 `{ "error": "no realm found" }`
- 400/500 bei Validierungs-/internen Fehlern

### POST /character

Listet Charaktere des authentifizierten Accounts je Realm.

Auth: erforderlich (`Authorization: Bearer <JWT>`)

Body

```json
{}
```

Response

- 200 `{ "characters": [ { "serverId": 1, "serverName": "<name>", "characters": [ { "guid": 1, "name": "<char>", "money": 0, "xp": 0, "level": 1 } ] } ] }`
- 401 bei fehlender Auth
- 500 bei internen Fehlern

### GET /casino/characters

Listet spielbare Charaktere pro Realm mit Kontostand (Kupfer und aufgeschlüsselt in Gold/Silber/Kupfer).

Auth: erforderlich

Response

- 200 `{ "characters": [ { "realmId": 1, "realmName": "<name>", "guid": 123, "name": "<char>", "balanceCopper": 12345, "balancePretty": { "gold": 1, "silver": 23, "copper": 45 } } ] }`
- 401 bei fehlender Auth
- 4xx/5xx bei Service-Fehlern

### POST /casino/coin-flip

Platziert eine Münzwurf-Wette auf einen Charakter. Gewinn/Verlust wird atomar in der Character-DB verbucht.

Auth: erforderlich

Body

```json
{ "realmId": 1, "characterGuid": 123, "wagerCopper": 100, "choice": "heads" }
```

Hinweis: `choice` akzeptiert auch `kopf/zahl` (case-insensitive). `wagerCopper` muss eine positive Ganzzahl sein (Kupfer).

Response

- 200 `{ "result": { "realmId": 1, "characterGuid": 123, "choice": "heads", "outcome": "tails", "win": false, "wagerCopper": 100, "previousBalance": 1000, "balanceChange": -100, "updatedBalance": 900, "previousBalancePretty": { ... }, "updatedBalancePretty": { ... } } }`

Fehler

- 401 Unauthorized / `INVALID_ACCOUNT`
- 400 `INVALID_WAGER` oder `INSUFFICIENT_FUNDS`
- 404 `CHARACTER_NOT_FOUND`
- 400 bei ungültiger Wahl (`choice`)
- 500 `TRANSACTION_FAILED`

### GET /sample

Beispielroute (nur zu Demonstrationszwecken).

Auth: erforderlich

Query

- `id` (optional, Realm-Id; Default 1)

Response

- 200 `{ "user": "<username>", "realmId": 1, "message": "..." }`

### GET /dev

Diagnostics/Dev-Route.

Response

- 200 `{ "message": "DEV ACCESSED" }`

---

## Security Notes

- helmet für sichere HTTP-Header (global, via `core`)
- compression für schnellere Antworten (global)
- CORS: wenn `FRONTEND_ORIGIN` gesetzt ist, wird nur diese Origin erlaubt; sonst offen
- express-rate-limit: global und speziell für Register/Login (IPv6-sichere Keys)
- `trust proxy` = `1` für Betrieb hinter Reverse Proxies / Cloudflare / IIS

Optionale Härtung (nicht standardmäßig aktiviert):

- Gemeinsamen `x-api-key` zwischen Frontend-Proxy und Backend verwenden.
- Backend hinter HTTPS (Caddy/IIS/Nginx) betreiben für TLS End-to-End.

---

## Troubleshooting

- Mixed Content: Bitte Frontend-Projekt beachten (Proxy/HTTPS erklärt dort).
- IPv6-Warnung bei rate-limit: `ipKeyGenerator(req)` verwenden (bereits implementiert).
- ER_BAD_FIELD_ERROR (1054): `account` muss `salt` + `verifier` nutzen (nicht legacy `sha_pass_hash`).
- Port nicht erreichbar: Firewall-Port öffnen (z. B. 3001).

---

## Links

- Plugin-Entwicklung: `src/plugins/README.md`

