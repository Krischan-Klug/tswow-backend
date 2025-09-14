import { getCharactersPool } from "plugin-core";

export interface CharacterInfo {
  guid: number;
  name: string;
  money: number;
  xp: number;
  level: number;
}

export async function getCharactersForAccount(
  realmId: number,
  accountId: number
): Promise<CharacterInfo[]> {
  const pool = getCharactersPool(realmId);
  const [rows] = await pool.execute(
    "SELECT guid, name, money, xp, level FROM characters WHERE account = ?",
    [accountId]
  );
  return rows as CharacterInfo[];
}
