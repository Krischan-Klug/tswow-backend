import { Router } from "express";
import { register, login } from "../controllers/auth.controller.js";
import { limiterRegister, limiterLogin } from "../middleware/rateLimiters.js";

const router = Router();

/** POST /auth/register */
router.post("/register", limiterRegister, register);

/** POST /auth/login (SRP6-based password check; no session issuance yet) */
router.post("/login", limiterLogin, login);

export default router;
