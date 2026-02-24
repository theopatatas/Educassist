import { Router } from "express";
import { changePassword, login, register } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.patch("/change-password", requireAuth, changePassword);

// protected test route
router.get("/me", requireAuth, (req: any, res) => {
  return res.json({ ok: true, user: req.user });
});

export default router;
