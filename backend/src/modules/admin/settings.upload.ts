import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";

const logoRoot = path.resolve(process.cwd(), "uploads", "branding");
fs.mkdirSync(logoRoot, { recursive: true });

export const schoolLogoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, logoRoot),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase();
      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (
      !new Set(["image/png", "image/jpeg", "image/webp"]).has(file.mimetype)
    ) {
      return callback(new Error("Choose a PNG, JPG, or WebP image."));
    }
    callback(null, true);
  },
});

export function schoolLogoUrl(filename: string) {
  return `/uploads/branding/${filename}`;
}

export function removeStoredLogo(url?: string | null) {
  if (!url?.startsWith("/uploads/branding/")) return;
  const filename = path.basename(url);
  const target = path.join(logoRoot, filename);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}
