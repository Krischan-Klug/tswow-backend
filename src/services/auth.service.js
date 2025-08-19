import { authPool } from "../db/pool.js";
import { computeVerifierFor } from "../utils/srp.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export async function register({ username, password, email }) {
  const [rows] = await authPool.execute(
    "SELECT id FROM account WHERE username = ?",
    [username]
  );
  if (rows.length > 0) {
    const err = new Error("username exists");
    err.code = "USERNAME_EXISTS";
    throw err;
  }

  const salt = crypto.randomBytes(32);
  const verifier = computeVerifierFor({ username, password, salt });

  await authPool.execute(
    "INSERT INTO account (username, salt, verifier, email) VALUES (?, ?, ?, ?)",
    [username, salt, verifier, email || ""]
  );
}

export async function verifyPassword({ username, password }) {
  const [rows] = await authPool.execute(
    "SELECT id, username, email, salt, verifier FROM account WHERE username = ? LIMIT 1",
    [username]
  );
  if (rows.length === 0) return { ok: false };

  const row = rows[0];
  const salt = Buffer.from(row.salt);
  const verifierDb = Buffer.from(row.verifier);
  const verifierTry = computeVerifierFor({ username, password, salt });

  const ok =
    verifierDb.length === verifierTry.length &&
    crypto.timingSafeEqual(verifierDb, verifierTry);
  if (!ok) return { ok: false };

  return {
    ok: true,
    account: { id: row.id, username: row.username, email: row.email ?? "" },
  };
}

export async function issueJwt({ id, username }) {
  const secret = process.env.JWT_SECRET || "changeme";
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  const token = jwt.sign({ id, username }, secret, { expiresIn });
  return token;
}

export async function getMeById(id) {
  const [rows] = await authPool.execute(
    "SELECT id, username, email FROM account WHERE id = ? LIMIT 1",
    [id]
  );
  if (rows.length === 0) return null;
  return rows[0];
}
