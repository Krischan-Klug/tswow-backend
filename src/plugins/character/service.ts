import { getCharactersPool } from "plugin-core";
import type { CharacterInfo } from "./types.js";

export async function getCharactersForAccount(
  realmId: number,
  accountId: number
): Promise<CharacterInfo[]> {
  const pool = getCharactersPool(realmId);
  const [rows] = await pool.execute(
    "SELECT guid, name, race, class, gender, money, xp, level FROM characters WHERE account = ?",
    [accountId]
  );
  return rows as CharacterInfo[];
}
