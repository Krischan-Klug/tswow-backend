import { Response } from "express";
import { logSampleMessage } from "./service.js";
import type { AuthRequest } from "../core/index.js";

export function showMessage(req: AuthRequest, res: Response): Response {
  logSampleMessage();
  return res.json({ message: `sample plugin executed for ${req.user?.username}` });
}
