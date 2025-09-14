import { Router } from "express";
import { register, login, me } from "./controller.js";
import { limiterRegister, limiterLogin, requireAuth } from "../core/index.js";

const router = Router();

router.post("/register", limiterRegister, register);
router.post("/login", limiterLogin, login);
router.get("/me", requireAuth, me);

export default router;
