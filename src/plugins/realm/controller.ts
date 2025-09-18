import { Request, Response } from "express";
import * as realmService from "./service.js";

export async function listRealms(
  _req: Request,
  res: Response
): Promise<Response> {
  try {
    const realms = await realmService.getRealmsWithPopulation();
    return res.json({ realms });
  } catch (err) {
    console.error("listRealms error", err);
    return res.status(500).json({ error: "failed to load realms" });
  }
}
