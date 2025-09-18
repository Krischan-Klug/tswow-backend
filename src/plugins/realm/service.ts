import { authPool, getCharactersPool } from "plugin-core";
import type { Realm } from "./types.js";

export async function getRealmById(id: number): Promise<Realm | null> {
  const [rows] = await authPool.execute(
    "SELECT name, address FROM realmlist WHERE id = ? LIMIT 1",
    [id]
  );

  if ((rows as any[]).length === 0) return null;
  return (rows as any[])[0];
}

export async function getPlayerCountById(id: number) {
  const charactersPool = getCharactersPool(id);
  const [rows] = await charactersPool.execute(
    "SELECT COUNT(*) AS population FROM characters WHERE online = 1",
    []
  );

  if ((rows as any[]).length === 0) return null;
  return (rows as any[])[0];
}

export async function getRealmlist() {
  const [rows] = await authPool.execute(
    "SELECT id, name, address, port FROM realmlist"
  );
  return rows as any[];
}
