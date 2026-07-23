"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
function errorHandler(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        return res
            .status(400)
            .json({ ok: false, message: "Validation error", issues: err.issues });
    }
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                ok: false,
                message: "The uploaded file exceeds the allowed size.",
            });
        }
        return res
            .status(400)
            .json({ ok: false, message: err.message || "File upload failed." });
    }
    if (typeof err === "object" && err !== null) {
        const anyErr = err;
        const status = anyErr.status ?? anyErr.code;
        if (status && typeof status === "number") {
            return res
                .status(status)
                .json({ ok: false, message: anyErr.message ?? "Request failed" });
        }
    }
    return res.status(500).json({ ok: false, message: "Internal server error" });
}
exports.default = errorHandler;
