// Controllers handle request/response; business logic lives in services.
import * as authService from "../services/auth.service.js";

export async function register(req, res) {
  const { username, password, email } = req.body || {};
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
  } catch (err) {
    if (err.code === "USERNAME_EXISTS") {
      return res.status(409).json({ error: "username already exists" });
    }
    console.error("register error:", err);
    return res.status(500).json({ error: "internal error" });
  }
}

export async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "username and password are required" });
  }
  const uname = String(username).trim();

  try {
    const ok = await authService.verifyPassword({
      username: uname,
      password: String(password),
    });
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    // Next step (later): issue JWT or httpOnly cookie here.
    return res.json({ message: "login ok" });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "internal error" });
  }
}
