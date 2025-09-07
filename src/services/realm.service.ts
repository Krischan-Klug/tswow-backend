import { authPool } from "../db/pool.js";

export interface Realm {
  name: string;
  address: string;
  population: number;
}

export async function getRealmById(id: number): Promise<Realm | null> {
  const [rows] = await authPool.execute(
    "SELECT name, address, population FROM realmlist WHERE id = ? LIMIT 1",
    [id]
  );

  if ((rows as any[]).length === 0) return null;
  return (rows as any[])[0];
}
