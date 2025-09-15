import type { ModulePlugin } from "../types.js";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

export const CorePlugin: ModulePlugin = {
  name: "core",
  version: "1.0.0",
  description: "Shared middleware, pools, and auth primitives used by other plugins.",
  // Core exports shared infra but registers no routes.
  async init(app, _context) {
    // Security & performance
    app.use(helmet());
    app.use(compression());

    // Body parsing
    app.use(express.json({ limit: "10kb" }));

    // CORS
    const allowedOrigin: string | undefined = process.env.FRONTEND_ORIGIN;
    if (allowedOrigin) {
      app.use((req: Request, res: Response, next: NextFunction) => {
        const origin = req.get("origin");
        if (!origin || origin === allowedOrigin) {
          return next();
        }
        return res.status(403).json({ error: "Forbidden" });
      });
      app.use(cors({ origin: allowedOrigin }));
    } else {
      app.use(cors());
    }

    // If behind reverse proxy / Cloudflare / IIS
    app.set("trust proxy", 1);

    // Global rate limiter
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: "draft-7",
        legacyHeaders: false,
      })
    );
  },
};

export default CorePlugin;

// Re-export shared building blocks for other plugins
export { default as errorHandler } from "./middleware/error.js";
export { requireAuth } from "./middleware/authJwt.js";
export type { AuthRequest, JwtPayload } from "./middleware/authJwt.js";
export { limiterRegister, limiterLogin } from "./middleware/rateLimiters.js";
export {
  authPool,
  getWorldPoolDest,
  getWorldPoolSource,
  getCharactersPool,
} from "./db/pool.js";
export { computeVerifierFor } from "./utils/srp.js";
export { runPluginValidation } from "./validate-plugins.js";
