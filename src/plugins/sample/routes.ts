import { Router } from "express";
import { showMessage } from "./controller.js";
import { requireAuth } from "../core/index.js";

const router = Router();

router.get("/", requireAuth, showMessage);

export default router;
