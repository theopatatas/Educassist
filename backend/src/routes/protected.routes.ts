import { Router } from "express";
import requireAuth from "../middleware/auth.middleware";

const router = Router();

router.get("/protected", requireAuth, (req, res) => {
  return res.json({ ok: true, message: "You are authenticated" });
});

export default router;
