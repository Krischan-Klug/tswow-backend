import { authPool, computeVerifierFor } from "plugin-core";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import type {
  Account,
  RegisterParams,
  VerifyPasswordParams,
  VerifyPasswordResult,
} from "./types.js";

export async function register({
  username,
  password,
  email,
}: RegisterParams): Promise<void> {
  const [rows] = await authPool.execute(
    "SELECT id FROM account WHERE username = ?",
    [username]
  );
  if ((rows as any[]).length > 0) {
    const err = new Error("username exists") as Error & { code?: string };
    err.code = "USERNAME_EXISTS";
    throw err;
  }

  const salt = crypto.randomBytes(32); // BINARY(32)
  const verifier = computeVerifierFor({ username, password, salt }); // BINARY(32)

  await authPool.execute(
    "INSERT INTO account (username, salt, verifier, email) VALUES (?, ?, ?, ?)",
    [username, salt, verifier, email || ""]
  );
}

export async function verifyPassword({
  username,
  password,
}: VerifyPasswordParams): Promise<VerifyPasswordResult> {
  const [rows] = await authPool.execute(
    "SELECT id, username, email, salt, verifier FROM account WHERE username = ? LIMIT 1",
    [username]
  );
  if ((rows as any[]).length === 0) return { ok: false };

  const row = (rows as any[])[0];
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

export function issueJwt({ id, username }: { id: number; username: string }): string {
  const secret: jwt.Secret = process.env.JWT_SECRET || "changeme";
  const expiresIn: StringValue = (process.env.JWT_EXPIRES_IN || "1d") as StringValue;
  return jwt.sign({ id, username }, secret, { expiresIn });
}

export async function getMeById(id: number): Promise<Account | null> {
  const [rows] = await authPool.execute(
    "SELECT id, username, email FROM account WHERE id = ? LIMIT 1",
    [id]
  );
  if ((rows as any[]).length === 0) return null;
  return (rows as any[])[0];
}

export async function getPrivilegesById(
  id: number
): Promise<{ SecurityLevel: number } | null> {
  const [rows] = await authPool.execute(
    "SELECT SecurityLevel FROM account_access WHERE AccountID = ? LIMIT 1",
    [id]
  );
  if ((rows as any[]).length === 0) return null;
  return (rows as any[])[0];
}
