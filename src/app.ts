import express, { Request, Response } from "express";
import initPlugins from "./plugins/index.js";
import { errorHandler } from "plugin-core";

const app = express();

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

await initPlugins(app);

app.use((req: Request, res: Response) =>
  res.status(404).json({ error: "Not found" })
);
app.use(errorHandler);

export default app;
