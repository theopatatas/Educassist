"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
function errorHandler(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({ ok: false, message: "Validation error", issues: err.issues });
    }
    if (typeof err === "object" && err !== null) {
        const anyErr = err;
        const status = anyErr.status ?? anyErr.code;
        if (status && typeof status === "number") {
            return res.status(status).json({ ok: false, message: anyErr.message ?? "Request failed" });
        }
    }
    return res.status(500).json({ ok: false, message: "Internal server error" });
}
exports.default = errorHandler;
