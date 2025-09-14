import { getRealmById } from "plugin-realm/service.js";

export function logSampleMessage(): void {
  console.log("Sample plugin says hello!");
}

export async function getSampleMessage(realmId = 1): Promise<string> {
  const realm = await getRealmById(realmId);
  if (realm) return `Sample plugin greeting from realm: ${realm.name}`;
  return "Sample plugin greeting (realm not found)";
}
