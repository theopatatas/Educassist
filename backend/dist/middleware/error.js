"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    console.error(err);
    const status = err?.statusCode || err?.status || 500;
    res.status(status).json({
        ok: false,
        message: err?.message || "Internal Server Error",
    });
}
