import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const limiterRegister = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Try later." },
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const name = (req.body?.username || "").toString().trim().toLowerCase();
    return `${ip}:${name}`;
  },
});

export const limiterLogin = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try later." },
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const name = (req.body?.username || "").toString().trim().toLowerCase();
    return `${ip}:${name}`;
  },
});
