import { Router } from "express";
import { showMessage } from "./controller.js";

const router = Router();

router.get("/", showMessage);

export default router;
