import mysql from "mysql2/promise";

export const authPool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "tswow",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_AUTH_1 || "auth",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
export const worldPoolDest = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "tswow",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_WORLD_D_1 || "default.dataset.world.dest",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
export const worldPoolSource = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "tswow",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_WORLD_S_1 || "default.dataset.world.source",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
export const worldPoolCharacters = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "tswow",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_CHARACTERS_1 || "default.realm.characters",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
