import { Request, Response } from "express";
import * as realmService from "./service.js";

export async function getRealmInfo(
  req: Request,
  res: Response
): Promise<Response> {
  const id = Number(req.body.id) || 1;
  const playerCount = await realmService.getPlayerCount(id);
  const realmInfo = await realmService.getRealmById(id);
  const realm = { ...realmInfo, ...playerCount };

  if (!realm) return res.status(404).json({ error: "no realm found" });
  return res.json(realm);
}
