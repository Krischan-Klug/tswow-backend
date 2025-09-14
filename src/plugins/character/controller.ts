import { Response } from "express";
import type { AuthRequest } from "plugin-core";
import { getCharactersForAccount } from "./service.js";
import { getRealmlist } from "plugin-realm";

type CharactersForAccount = Awaited<ReturnType<typeof getCharactersForAccount>>;
type Character = CharactersForAccount extends Array<infer T> ? T : never;

interface ServerCharacters {
  serverId: number;
  characters: Character[];
}

export async function listCharacters(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  const accountId = req.user?.id;
  if (!accountId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const realms = await getRealmlist();

    const charactersPerServer: ServerCharacters[] = await Promise.all(
      realms.map(async (realm) => ({
        serverId: realm.id,
        characters: await getCharactersForAccount(realm.id, accountId),
      }))
    );

    return res.json({ characters: charactersPerServer });
  } catch (err) {
    console.error("listCharacters error:", err);
    return res.status(500).json({ error: "Failed to load characters" });
  }
}
