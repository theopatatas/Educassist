"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAttachmentUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
exports.aiAttachmentUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 5,
    },
    fileFilter: (_request, file, callback) => {
        if (allowedTypes.has(file.mimetype)) {
            callback(null, true);
            return;
        }
        callback(new Error("Unsupported attachment. Upload an image, PDF, text, CSV, JSON, Markdown, or DOCX file."));
    },
});
