import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";

const app = express();

/** Security & performance */
app.use(helmet());
app.use(compression());

/** Body parsing */
app.use(express.json({ limit: "10kb" }));

/** CORS (open now; restrict later if needed) */
app.use(cors());

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
app.get("/health", (req, res) => res.json({ ok: true }));

/** Routes */
app.use("/auth", authRoutes);

/** Fallback 404 */
app.use((req, res) => res.status(404).json({ error: "Not found" }));

export default app;
