"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (error, _req, res, next) => {
    void next;
    console.error(error);
    const err = typeof error === "object" && error !== null
        ? error
        : {};
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
        ok: false,
        message: err.message || "Internal Server Error",
    });
};
exports.errorHandler = errorHandler;
