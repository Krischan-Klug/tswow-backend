import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import realmRoutes from "./routes/realm.routes.js";
import errorHandler from "./middleware/error.js";

const app = express();

/** Security & performance */
app.use(helmet());
app.use(compression());

/** Body parsing */
app.use(express.json({ limit: "10kb" }));

/** CORS */
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

/** If behind reverse proxy / Cloudflare / IIS */
app.set("trust proxy", 1);

/** Global, mild rate limit */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

/** Healthcheck */
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

/** Routes */
app.use("/auth", authRoutes);
app.use("/realm", realmRoutes);

/** Fallback 404 */
app.use((req: Request, res: Response) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;
