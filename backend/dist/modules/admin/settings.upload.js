"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schoolLogoUpload = void 0;
exports.schoolLogoUrl = schoolLogoUrl;
exports.removeStoredLogo = removeStoredLogo;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const multer_1 = __importDefault(require("multer"));
const logoRoot = path_1.default.resolve(process.cwd(), "uploads", "branding");
fs_1.default.mkdirSync(logoRoot, { recursive: true });
exports.schoolLogoUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, callback) => callback(null, logoRoot),
        filename: (_req, file, callback) => {
            const extension = path_1.default.extname(file.originalname || "").toLowerCase();
            callback(null, `${Date.now()}-${(0, crypto_1.randomUUID)()}${extension}`);
        },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.mimetype)) {
            return callback(new Error("Choose a PNG, JPG, or WebP image."));
        }
        callback(null, true);
    },
});
function schoolLogoUrl(filename) {
    return `/uploads/branding/${filename}`;
}
function removeStoredLogo(url) {
    if (!url?.startsWith("/uploads/branding/"))
        return;
    const filename = path_1.default.basename(url);
    const target = path_1.default.join(logoRoot, filename);
    if (fs_1.default.existsSync(target))
        fs_1.default.unlinkSync(target);
}
