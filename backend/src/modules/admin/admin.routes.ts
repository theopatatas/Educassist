import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { overview } from "./admin.controller";

const router = Router();

router.get("/overview", requireAuth, requireRole("admin"), overview);

export default router;
