import { Router } from "express";
import { showDev } from "./controller.js";

const router = Router();

router.get("/", showDev);

export default router;
