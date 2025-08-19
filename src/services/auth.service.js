// Services host the business logic, talk to DB via pools, call utils, etc.
import { authPool } from "../db/pool.js";
import { computeVerifierFor } from "../utils/srp.js";
import crypto from "crypto";

export async function register({ username, password, email }) {
  // Check if user exists
  const [rows] = await authPool.execute(
    "SELECT id FROM account WHERE username = ?",
    [username]
  );
  if (rows.length > 0) {
    const err = new Error("username exists");
    err.code = "USERNAME_EXISTS";
    throw err;
  }

  // SRP6 salt + verifier (BINARY(32))
  const salt = crypto.randomBytes(32);
  const verifier = computeVerifierFor({ username, password, salt });

  await authPool.execute(
    "INSERT INTO account (username, salt, verifier, email) VALUES (?, ?, ?, ?)",
    [username, salt, verifier, email || ""]
  );
}

export async function verifyPassword({ username, password }) {
  // Load user's salt + verifier
  const [rows] = await authPool.execute(
    "SELECT salt, verifier FROM account WHERE username = ? LIMIT 1",
    [username]
  );
  if (rows.length === 0) return false;

  const row = rows[0];
  const salt = Buffer.from(row.salt); // BINARY(32)
  const verifierDb = Buffer.from(row.verifier);

  // Re-compute verifier with provided password and stored salt
  const verifierTry = computeVerifierFor({ username, password, salt });

  // Constant-time compare
  if (verifierDb.length !== verifierTry.length) return false;
  return crypto.timingSafeEqual(verifierDb, verifierTry);
}
