import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const hdr = req.get("authorization") || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "changeme");
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}
