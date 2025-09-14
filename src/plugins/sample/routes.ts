import { Router } from "express";
import { showMessage } from "./controller.js";
import { requireAuth } from "plugin-core";

const router = Router();

router.get("/", requireAuth, showMessage);

export default router;
