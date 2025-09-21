import { getRealmlist } from "plugin-realm";
import { getCharactersForAccount } from "plugin-character";
import { toCurrencyBreakdown } from "./common/money.js";
import { CasinoError } from "./common/errors.js";
import type { CasinoCharacter } from "./types.js";

export async function getPlayableCharacters(
  accountId: number
): Promise<CasinoCharacter[]> {
  if (!Number.isInteger(accountId) || accountId <= 0) {
    throw new CasinoError("A valid account is required", "INVALID_ACCOUNT");
  }

  const realms = await getRealmlist();
  const characters: CasinoCharacter[] = [];

  for (const realm of realms) {
    const realmId = Number((realm as any).id);
    const realmName = String((realm as any).name ?? "Unknown Realm");
    if (!Number.isInteger(realmId)) continue;

    const realmCharacters = await getCharactersForAccount(realmId, accountId);
    for (const character of realmCharacters) {
      characters.push({
        realmId,
        realmName,
        guid: character.guid,
        name: character.name,
        balanceCopper: character.money,
        balancePretty: toCurrencyBreakdown(character.money),
      });
    }
  }

  return characters;
}

