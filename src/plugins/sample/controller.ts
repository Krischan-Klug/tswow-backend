import { Request, Response } from "express";
import { logSampleMessage } from "./service.js";

export function showMessage(req: Request, res: Response): Response {
  logSampleMessage();
  return res.json({ message: "sample plugin executed" });
}
