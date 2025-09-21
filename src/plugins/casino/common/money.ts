import type { PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { getCharactersPool } from "plugin-core";
import { CasinoError } from "./errors.js";
import type { CurrencyBreakdown } from "../types.js";

export function toCurrencyBreakdown(value: number): CurrencyBreakdown {
  const remaining = Math.max(0, Math.trunc(value));
  const gold = Math.trunc(remaining / 10000);
  const silver = Math.trunc((remaining % 10000) / 100);
  const copper = remaining % 100;
  return { gold, silver, copper };
}

export function validateCommonWagerInputs(params: {
  accountId: number;
  realmId: number;
  characterGuid: number;
  wagerCopper: number;
}): void {
  const { accountId, realmId, characterGuid, wagerCopper } = params;
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
}

export async function fetchCharacterBalance(
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

export async function updateCharacterBalance(
  connection: PoolConnection,
  accountId: number,
  characterGuid: number,
  updatedBalance: number
): Promise<void> {
  await connection.execute(
    "UPDATE characters SET money = ? WHERE guid = ? AND account = ?",
    [updatedBalance, characterGuid, accountId]
  );
}

export async function processWager<TOutcome>(params: {
  realmId: number;
  accountId: number;
  characterGuid: number;
  wagerCopper: number;
  compute: (currentBalance: number) => {
    outcome: TOutcome;
    win: boolean;
    balanceChange: number;
  };
}): Promise<{
  previousBalance: number;
  updatedBalance: number;
  balanceChange: number;
  previousBalancePretty: CurrencyBreakdown;
  updatedBalancePretty: CurrencyBreakdown;
  outcome: TOutcome;
  win: boolean;
}> {
  const { realmId, accountId, characterGuid, wagerCopper, compute } = params;

  validateCommonWagerInputs({ accountId, realmId, characterGuid, wagerCopper });

  const pool = getCharactersPool(realmId);
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const currentBalance = await fetchCharacterBalance(
      connection,
      accountId,
      characterGuid
    );

    if (currentBalance < wagerCopper) {
      throw new CasinoError("Insufficient gold for wager", "INSUFFICIENT_FUNDS");
    }

    const { outcome, win, balanceChange } = compute(currentBalance);
    const updatedBalance = currentBalance + balanceChange;

    if (updatedBalance < 0) {
      throw new CasinoError(
        "Result would lead to a negative balance",
        "TRANSACTION_FAILED"
      );
    }

    await updateCharacterBalance(
      connection,
      accountId,
      characterGuid,
      updatedBalance
    );

    await connection.commit();
    transactionStarted = false;

    return {
      previousBalance: currentBalance,
      updatedBalance,
      balanceChange,
      previousBalancePretty: toCurrencyBreakdown(currentBalance),
      updatedBalancePretty: toCurrencyBreakdown(updatedBalance),
      outcome,
      win,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("processWager rollback failed", rollbackError);
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

