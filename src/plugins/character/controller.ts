import { Response } from "express";
import type { AuthRequest } from "plugin-core";
import { getCharactersForAccount } from "./service.js";
import { getRealmlist } from "plugin-realm";

export async function listCharacters(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  const accountId = req.user?.id;
  if (!accountId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const realms = await getRealmlist();

  const characters = await Promise.all(
    realms.map((realm) => getCharactersForAccount(realm.id, accountId))
  );

  console.log(characters);
  return res.json({ characters });
}
