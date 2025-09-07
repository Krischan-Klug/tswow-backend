// Central place for mysql2 pools. Later you can add characters/world pools.
import mysql from "mysql2/promise";

export const authPool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "tswow",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "auth",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Example for a second DB (uncomment when needed):
// export const charactersPool = mysql.createPool({
//   host: process.env.DB_HOST || "127.0.0.1",
//   port: Number(process.env.DB_PORT || 3306),
//   user: process.env.DB_USER || "tswow",
//   password: process.env.DB_PASS || "password",
//   database: process.env.DB_CHAR_DB || "characters",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });
