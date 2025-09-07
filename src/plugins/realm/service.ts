import { authPool, charactersPool } from "../../db/pool.js";

export interface Realm {
  name: string;
  address: string;
}

export async function getRealmById(id: number): Promise<Realm | null> {
  const [rows] = await authPool.execute(
    "SELECT name, address FROM realmlist WHERE id = ? LIMIT 1",
    [id]
  );

  if ((rows as any[]).length === 0) return null;
  return (rows as any[])[0];
}

export async function getPlayerCount() {
  const [rows] = await charactersPool.execute(
    "SELECT COUNT(*) AS population FROM characters WHERE online = 1",
    []
  );

  if ((rows as any[]).length === 0) return null;
  return (rows as any[])[0];
}
