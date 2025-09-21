import crypto from "node:crypto";
import type {
  CoinFlipBetRequest,
  CoinFlipBetResult,
  CoinFlipChoice,
} from "../types.js";
import { processWager } from "../common/money.js";
import { CasinoError } from "../common/errors.js";

// true = heads, false = tails
export function rollCoinFlip(): CoinFlipChoice {
  return crypto.randomInt(0, 2) === 0;
}

// Accept strict boolean or string boolean values.
export function normalizeCoinFlipChoice(value: unknown): CoinFlipChoice | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return null;
}

export async function executeCoinFlipBet(
  request: CoinFlipBetRequest
): Promise<CoinFlipBetResult> {
  const { accountId, realmId, characterGuid, wagerCopper, choice } = request;

  if (typeof choice !== "boolean") {
    throw new CasinoError("Choice must be true or false", "INVALID_WAGER");
  }

  const result = await processWager<CoinFlipChoice>({
    realmId,
    accountId,
    characterGuid,
    wagerCopper,
    compute: () => {
      const outcome = rollCoinFlip();
      const win = outcome === choice;
      const balanceChange = win ? wagerCopper : -wagerCopper;
      return { outcome, win, balanceChange };
    },
  });

  return {
    realmId,
    characterGuid,
    choice,
    outcome: result.outcome,
    win: result.win,
    wagerCopper,
    previousBalance: result.previousBalance,
    balanceChange: result.balanceChange,
    updatedBalance: result.updatedBalance,
    previousBalancePretty: result.previousBalancePretty,
    updatedBalancePretty: result.updatedBalancePretty,
  };
}
