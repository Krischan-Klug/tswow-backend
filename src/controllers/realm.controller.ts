import { Request, Response } from "express";
import * as realmService from "../services/realm.service.js";

export async function getRealmInfo(
  req: Request,
  res: Response
): Promise<Response> {
  const realm = await realmService.getRealmById(req.body.id);
  if (!realm) return res.status(404).json({ error: "no realm found" });
  return res.json(realm);
}
