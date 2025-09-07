import { Router } from "express";
import { getRealmInfo } from "./controller.js";

const router = Router();

router.post("/info", getRealmInfo);

export default router;
