"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.changePassword = changePassword;
const auth_schemas_1 = require("./auth.schemas");
const auth_service_1 = require("./auth.service");
async function register(req, res) {
    const input = auth_schemas_1.registerSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    try {
        const result = await (0, auth_service_1.registerUser)(input.data);
        if (!result.ok) {
            return res.status(result.code).json({ ok: false, message: result.message });
        }
        return res.status(201).json(result);
    }
    catch (err) {
        if (err?.name === "SequelizeUniqueConstraintError") {
            const fields = Object.keys(err?.fields ?? {});
            if (fields.includes("email")) {
                return res.status(409).json({ ok: false, message: "Email already in use" });
            }
            if (fields.includes("lrn")) {
                return res.status(409).json({ ok: false, message: "LRN already in use" });
            }
            return res.status(409).json({ ok: false, message: "Duplicate data already exists" });
        }
        if (err?.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ ok: false, message: "Invalid related data (check Section)." });
        }
        throw err;
    }
}
async function login(req, res) {
    const input = auth_schemas_1.loginSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    const result = await (0, auth_service_1.loginUser)(input.data.email, input.data.password);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json(result);
}
async function changePassword(req, res) {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    }
    const input = auth_schemas_1.changePasswordSchema.safeParse(req.body);
    if (!input.success) {
        return res.status(400).json({ ok: false, message: "Invalid input", issues: input.error.issues });
    }
    const result = await (0, auth_service_1.changeUserPassword)(userId, input.data.currentPassword, input.data.newPassword);
    if (!result.ok) {
        return res.status(result.code).json({ ok: false, message: result.message });
    }
    return res.json({ ok: true, message: result.message });
}
