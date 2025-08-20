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
    const result = await authService.verifyPassword({
      username: uname,
      password: String(password),
    });
    if (!result.ok)
      return res.status(401).json({ error: "invalid credentials" });

    const token = authService.issueJwt({
      id: result.account.id,
      username: result.account.username,
    });

    return res.json({ token, account: result.account });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "internal error" });
  }
}

export async function me(req, res) {
  const account = await authService.getMeById(req.user.id);
  const account_access = await authService.getPrivilegesById(req.user.id);

  const user = { ...account, ...account_access };
  if (!user) return res.status(404).json({ error: "not found" });
  return res.json({ account: user });
}
