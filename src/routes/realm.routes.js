import { Router } from "express";
import { getRealmInfo } from "../controllers/realm.controller.js";

const router = Router();

router.post("/info", getRealmInfo);

export default router;
