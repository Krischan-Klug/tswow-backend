import { Router } from "express";
import { listCharacters } from "./controller.js";
import { requireAuth } from "plugin-core";

const router = Router();

router.post("/", requireAuth, listCharacters);

export default router;
