import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller.js";
import { limiterRegister, limiterLogin } from "../middleware/rateLimiters.js";
import { requireAuth } from "../middleware/authJwt.js";

const router = Router();

router.post("/register", limiterRegister, register);
router.post("/login", limiterLogin, login);
router.get("/me", requireAuth, me);

export default router;
