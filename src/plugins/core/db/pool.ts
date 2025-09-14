import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

interface AuthConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface RealmConfig {
  id: number;
  host: string;
  port: number;
  user: string;
  password: string;
  worldDest: string;
  worldSource: string;
  characters: string;
}

interface DbConfig {
  auth: AuthConfig;
  realms: RealmConfig[];
}

const CONFIG_FILE = path.resolve(process.cwd(), "db.json");

function loadConfig(): DbConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaults: DbConfig = {
      auth: {
        host: "127.0.0.1",
        port: 3306,
        user: "tswow",
        password: "password",
        database: "auth",
      },
      realms: [
        {
          id: 1,
          host: "127.0.0.1",
          port: 3306,
          user: "tswow",
          password: "password",
          worldDest: "default.dataset.world.dest",
          worldSource: "default.dataset.world.source",
          characters: "default.realm.characters",
        },
      ],
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2), "utf8");
    return defaults;
  }
  const raw = fs.readFileSync(CONFIG_FILE, "utf8");
  return JSON.parse(raw) as DbConfig;
}

const config = loadConfig();

export const authPool = mysql.createPool({
  host: config.auth.host,
  port: config.auth.port,
  user: config.auth.user,
  password: config.auth.password,
  database: config.auth.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

type PoolGroup = {
  worldDest: mysql.Pool;
  worldSource: mysql.Pool;
  characters: mysql.Pool;
};

const pools = new Map<number, PoolGroup>();

for (const cfg of config.realms) {
  const base = {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  } as const;

  pools.set(cfg.id, {
    worldDest: mysql.createPool({ ...base, database: cfg.worldDest }),
    worldSource: mysql.createPool({ ...base, database: cfg.worldSource }),
    characters: mysql.createPool({ ...base, database: cfg.characters }),
  });
}

function ensurePool(id: number): PoolGroup {
  const pg = pools.get(id);
  if (!pg) {
    throw new Error(`No database configuration for realm id ${id}`);
  }
  return pg;
}

export function getWorldPoolDest(id = 1): mysql.Pool {
  return ensurePool(id).worldDest;
}

export function getWorldPoolSource(id = 1): mysql.Pool {
  return ensurePool(id).worldSource;
}

export function getCharactersPool(id = 1): mysql.Pool {
  return ensurePool(id).characters;
}

