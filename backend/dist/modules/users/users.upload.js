"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilePhotoUpload = void 0;
exports.profilePhotoUrl = profilePhotoUrl;
exports.removeProfilePhoto = removeProfilePhoto;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const multer_1 = __importDefault(require("multer"));
const profileRoot = path_1.default.resolve(process.cwd(), "uploads", "profiles");
fs_1.default.mkdirSync(profileRoot, { recursive: true });
exports.profilePhotoUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, callback) => callback(null, profileRoot),
        filename: (_req, file, callback) => callback(null, `${Date.now()}-${(0, crypto_1.randomUUID)()}${path_1.default.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.mimetype))
            return callback(new Error("Choose a PNG, JPG, or WebP image."));
        callback(null, true);
    },
});
function profilePhotoUrl(filename) {
    return `/uploads/profiles/${filename}`;
}
function removeProfilePhoto(url) {
    if (!url?.startsWith("/uploads/profiles/"))
        return;
    const target = path_1.default.join(profileRoot, path_1.default.basename(url));
    if (fs_1.default.existsSync(target))
        fs_1.default.unlinkSync(target);
}
