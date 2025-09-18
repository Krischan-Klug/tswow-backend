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

