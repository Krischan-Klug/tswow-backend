import { Router } from "express";
import { listRealms } from "./controller.js";

const router = Router();

router.get("/", listRealms);

export default router;
