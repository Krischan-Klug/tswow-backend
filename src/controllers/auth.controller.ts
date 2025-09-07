import { Request, Response } from "express";
import * as authService from "../services/auth.service.js";
import { AuthRequest } from "../middleware/authJwt.js";

export async function register(req: Request, res: Response): Promise<Response> {
  const { username, password, email } = (req.body || {}) as {
    username?: string;
    password?: string;
    email?: string;
  };
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "username and password are required" });
  }
  const uname = String(username).trim();
  if (uname.length < 3 || uname.length > 32) {
    return res.status(400).json({ error: "username must be 3–32 chars" });
  }

  try {
    await authService.register({
      username: uname,
      password: String(password),
      email: email ? String(email) : "",
    });
    return res.status(201).json({ message: "account created" });
  } catch (err: unknown) {
    if (typeof err === "object" && err && (err as any).code === "USERNAME_EXISTS") {
      return res.status(409).json({ error: "username already exists" });
    }
    console.error("register error:", err);
    return res.status(500).json({ error: "internal error" });
  }
}

export async function login(req: Request, res: Response): Promise<Response> {
  const { username, password } = (req.body || {}) as {
    username?: string;
    password?: string;
  };
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "username and password are required" });
  }
  const uname = String(username).trim();

  try {
    const result = await authService.verifyPassword({
      username: uname,
      password: String(password),
    });
    if (!result.ok)
      return res.status(401).json({ error: "invalid credentials" });

    const token = authService.issueJwt({
      id: result.account!.id,
      username: result.account!.username,
    });

    return res.json({ token, account: result.account });
  } catch (err: unknown) {
    console.error("login error:", err);
    return res.status(500).json({ error: "internal error" });
  }
}

export async function me(req: AuthRequest, res: Response): Promise<Response> {
  const account = await authService.getMeById(req.user!.id);
  let account_access = await authService.getPrivilegesById(req.user!.id);
  if (!account_access) account_access = { SecurityLevel: 0 };
  const user = { ...account, ...account_access };
  if (!user) return res.status(404).json({ error: "not found" });
  return res.json({ account: user });
}
