import rateLimit, { ipKeyGenerator, RateLimitRequestHandler } from "express-rate-limit";
import { Request } from "express";

export const limiterRegister: RateLimitRequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Try later." },
  keyGenerator: (req: Request) => {
    const ip = ipKeyGenerator(req.ip || "");
    const name = (req.body?.username || "").toString().trim().toLowerCase();
    return `${ip}:${name}`;
  },
});

export const limiterLogin: RateLimitRequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try later." },
  keyGenerator: (req: Request) => {
    const ip = ipKeyGenerator(req.ip || "");
    const name = (req.body?.username || "").toString().trim().toLowerCase();
    return `${ip}:${name}`;
  },
});
