import { Response } from "express";
import { logSampleMessage } from "./service.js";
import { AuthRequest } from "../../middleware/authJwt.js";

export function showMessage(req: AuthRequest, res: Response): Response {
  logSampleMessage();
  return res.json({ message: `sample plugin executed for ${req.user?.username}` });
}
