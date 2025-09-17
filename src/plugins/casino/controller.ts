import { Response } from "express";
import type { AuthRequest } from "plugin-core";
import {
  CasinoError,
  executeCoinFlipBet,
  getPlayableCharacters,
  normalizeChoice,
} from "./service.js";

function handleCasinoError(res: Response, error: CasinoError): Response {
  switch (error.code) {
    case "INVALID_ACCOUNT":
      return res.status(401).json({ error: error.message });
    case "INVALID_WAGER":
      return res.status(400).json({ error: error.message });
    case "CHARACTER_NOT_FOUND":
      return res.status(404).json({ error: error.message });
    case "INSUFFICIENT_FUNDS":
      return res.status(400).json({ error: error.message });
    default:
      return res.status(500).json({ error: error.message });
  }
}

export async function listPlayableCasinoCharacters(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  const accountId = req.user?.id;
  if (!accountId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const characters = await getPlayableCharacters(accountId);
    return res.json({ characters });
  } catch (error) {
    if (error instanceof CasinoError) {
      return handleCasinoError(res, error);
    }
    console.error("listPlayableCasinoCharacters error", error);
    return res.status(500).json({ error: "Failed to load casino characters" });
  }
}

export async function playCoinFlip(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  const accountId = req.user?.id;
  if (!accountId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const body = req.body ?? {};
  const realmId = Number(body.realmId);
  const characterGuid = Number(body.characterGuid);
  const rawWager = Number(body.wagerCopper ?? body.wager);
  const wagerCopper = Number.isFinite(rawWager) ? Math.trunc(rawWager) : NaN;
  const choiceInput = typeof body.choice === "string" ? body.choice : "";
  const choice = normalizeChoice(choiceInput || "");

  if (!choice) {
    return res.status(400).json({ error: "Choice must be heads or tails" });
  }

  try {
    const result = await executeCoinFlipBet({
      accountId,
      realmId,
      characterGuid,
      wagerCopper,
      choice,
    });

    return res.json({ result });
  } catch (error) {
    if (error instanceof CasinoError) {
      return handleCasinoError(res, error);
    }
    console.error("playCoinFlip error", error);
    return res.status(500).json({ error: "Coin flip failed" });
  }
}

