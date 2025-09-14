import { Response } from "express";
import { logSampleMessage, getSampleMessage } from "./service.js";
import type { AuthRequest } from "plugin-core";

export async function showMessage(req: AuthRequest, res: Response): Promise<Response> {
  logSampleMessage();
  const realmId = Number(req.query?.id ?? 1) || 1;
  const message = await getSampleMessage(realmId);
  return res.json({
    user: req.user?.username,
    realmId,
    message,
  });
}
