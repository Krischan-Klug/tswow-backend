import * as realmService from "../services/realm.service.js";

export async function getRealmInfo(req, res) {
  const realm = await realmService.getRealmById(req.body.id);
  if (!realm) return res.status(404).json({ error: "not found" });
  return res.json(realm);
}
