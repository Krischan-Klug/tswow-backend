import { Router } from "express";
import { requireAuth } from "plugin-core";
import { listPlayableCasinoCharacters, playCoinFlip } from "./controller.js";

const router = Router();

router.get("/characters", requireAuth, listPlayableCasinoCharacters);
router.post("/coin-flip", requireAuth, playCoinFlip);

export default router;

