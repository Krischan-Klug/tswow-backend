import { authPool } from "../db/pool.js";

export async function getRealmById(id) {
  const [rows] = await authPool.execute(
    "SELECT name, address, population FROM realmlist WHERE id = ? LIMIT 1",
    [id]
  );

  if (rows.length === 0) return null;
  return rows[0];
}
