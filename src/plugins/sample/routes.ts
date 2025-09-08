import { Router } from "express";
import { showMessage } from "./controller.js";
import { requireAuth } from "../../middleware/authJwt.js";

const router = Router();

router.get("/", requireAuth, showMessage);

export default router;
