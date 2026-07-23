"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewerUpload = void 0;
exports.toReviewerUrl = toReviewerUrl;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
const uploadRoot = path_1.default.resolve(process.cwd(), "uploads", "reviewers");
fs_1.default.mkdirSync(uploadRoot, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadRoot);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname || "");
        cb(null, `${Date.now()}-${(0, crypto_1.randomUUID)()}${ext}`);
    },
});
const allowedMimeTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png",
    "image/jpeg",
]);
exports.reviewerUpload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            return cb(new Error("Invalid file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, PNG, JPG."));
        }
        cb(null, true);
    },
});
function toReviewerUrl(filename) {
    return `/uploads/reviewers/${filename}`;
}
