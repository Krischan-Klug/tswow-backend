import type { CasinoErrorCode } from "../types.js";

export class CasinoError extends Error {
  public readonly code: CasinoErrorCode;

  constructor(message: string, code: CasinoErrorCode, options?: ErrorOptions) {
    super(message, options);
    this.name = "CasinoError";
    this.code = code;
  }
}

