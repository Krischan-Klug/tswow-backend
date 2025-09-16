import crypto from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { getCharactersPool } from "plugin-core";
import { getRealmlist } from "plugin-realm";
import { getCharactersForAccount } from "plugin-character";

export interface CurrencyBreakdown {
  gold: number;
  silver: number;
  copper: number;
}

export interface CasinoCharacter {
  realmId: number;
  realmName: string;
  guid: number;
  name: string;
  balanceCopper: number;
  balancePretty: CurrencyBreakdown;
}

export type CoinFlipChoice = "heads" | "tails";

export interface CoinFlipBetRequest {
  accountId: number;
  realmId: number;
  characterGuid: number;
  wagerCopper: number;
  choice: CoinFlipChoice;
}

export interface CoinFlipBetResult {
  realmId: number;
  characterGuid: number;
  choice: CoinFlipChoice;
  outcome: CoinFlipChoice;
  win: boolean;
  wagerCopper: number;
  previousBalance: number;
  balanceChange: number;
  updatedBalance: number;
  previousBalancePretty: CurrencyBreakdown;
  updatedBalancePretty: CurrencyBreakdown;
}

export type CasinoErrorCode =
  | "INVALID_ACCOUNT"
  | "INVALID_WAGER"
  | "CHARACTER_NOT_FOUND"
  | "INSUFFICIENT_FUNDS"
  | "TRANSACTION_FAILED";

export class CasinoError extends Error {
  public readonly code: CasinoErrorCode;

  constructor(message: string, code: CasinoErrorCode, options?: ErrorOptions) {
    super(message, options);
    this.name = "CasinoError";
    this.code = code;
  }
}

function toCurrencyBreakdown(value: number): CurrencyBreakdown {
  const remaining = Math.max(0, Math.trunc(value));
  const gold = Math.trunc(remaining / 10000);
  const silver = Math.trunc((remaining % 10000) / 100);
  const copper = remaining % 100;
  return { gold, silver, copper };
}

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

function rollCoin(): CoinFlipChoice {
  return crypto.randomInt(0, 2) === 0 ? "heads" : "tails";
}

async function fetchCharacterBalance(
  connection: PoolConnection,
  accountId: number,
  characterGuid: number
): Promise<number> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT money FROM characters WHERE guid = ? AND account = ? FOR UPDATE",
    [characterGuid, accountId]
  );
  if (rows.length === 0) {
    throw new CasinoError(
      "Character not found for the authenticated account",
      "CHARACTER_NOT_FOUND"
    );
  }

  const balance = Number(rows[0].money ?? 0);
  if (!Number.isFinite(balance)) {
    throw new CasinoError("Character balance is invalid", "TRANSACTION_FAILED");
  }
  return Math.trunc(balance);
}

export async function executeCoinFlipBet(
  request: CoinFlipBetRequest
): Promise<CoinFlipBetResult> {
  const { accountId, realmId, characterGuid, wagerCopper, choice } = request;

  if (!Number.isInteger(accountId) || accountId <= 0) {
    throw new CasinoError("A valid account is required", "INVALID_ACCOUNT");
  }
  if (!Number.isInteger(realmId) || realmId <= 0) {
    throw new CasinoError("A valid realm is required", "TRANSACTION_FAILED");
  }
  if (!Number.isInteger(characterGuid) || characterGuid <= 0) {
    throw new CasinoError("A valid character is required", "CHARACTER_NOT_FOUND");
  }
  if (!Number.isInteger(wagerCopper) || wagerCopper <= 0) {
    throw new CasinoError("Wager must be a positive whole number", "INVALID_WAGER");
  }

  const pool = getCharactersPool(realmId);
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the character balance row to process the wager atomically.
    const currentBalance = await fetchCharacterBalance(
      connection,
      accountId,
      characterGuid
    );

    if (currentBalance < wagerCopper) {
      throw new CasinoError("Insufficient gold for wager", "INSUFFICIENT_FUNDS");
    }

    const outcome = rollCoin();
    const win = outcome === choice;
    const balanceChange = win ? wagerCopper : -wagerCopper;
    const updatedBalance = currentBalance + balanceChange;

    if (updatedBalance < 0) {
      throw new CasinoError(
        "Result would lead to a negative balance",
        "TRANSACTION_FAILED"
      );
    }

    await connection.execute(
      "UPDATE characters SET money = ? WHERE guid = ? AND account = ?",
      [updatedBalance, characterGuid, accountId]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      realmId,
      characterGuid,
      choice,
      outcome,
      win,
      wagerCopper,
      previousBalance: currentBalance,
      balanceChange,
      updatedBalance,
      previousBalancePretty: toCurrencyBreakdown(currentBalance),
      updatedBalancePretty: toCurrencyBreakdown(updatedBalance),
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("executeCoinFlipBet rollback failed", rollbackError);
      }
    }

    if (error instanceof CasinoError) {
      throw error;
    }

    throw new CasinoError(
      "Unexpected error while processing wager",
      "TRANSACTION_FAILED",
      error instanceof Error ? { cause: error } : undefined
    );
  } finally {
    connection.release();
  }
}

export function normalizeChoice(value: string): CoinFlipChoice | null {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "heads":
    case "kopf":
      return "heads";
    case "tails":
    case "zahl":
      return "tails";
    default:
      return null;
  }
}

