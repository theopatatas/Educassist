"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveAttachmentUpload = void 0;
exports.leaveAttachmentUrl = leaveAttachmentUrl;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
const uploadRoot = path_1.default.resolve(process.cwd(), "uploads", "leave-attachments");
fs_1.default.mkdirSync(uploadRoot, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadRoot),
    filename: (_request, file, callback) => callback(null, `${Date.now()}-${(0, crypto_1.randomUUID)()}${path_1.default.extname(file.originalname)}`),
});
const allowed = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
]);
exports.leaveAttachmentUpload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => allowed.has(file.mimetype)
        ? callback(null, true)
        : callback(new Error("Allowed attachments: PDF, DOC, DOCX, JPG, JPEG, and PNG.")),
});
function leaveAttachmentUrl(filename) {
    return `/uploads/leave-attachments/${filename}`;
}
