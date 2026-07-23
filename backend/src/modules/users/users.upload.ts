import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";

const profileRoot = path.resolve(process.cwd(), "uploads", "profiles");
fs.mkdirSync(profileRoot, { recursive: true });

export const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, profileRoot),
    filename: (_req, file, callback) =>
      callback(
        null,
        `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.mimetype))
      return callback(new Error("Choose a PNG, JPG, or WebP image."));
    callback(null, true);
  },
});

export function profilePhotoUrl(filename: string) {
  return `/uploads/profiles/${filename}`;
}
export function removeProfilePhoto(url?: string | null) {
  if (!url?.startsWith("/uploads/profiles/")) return;
  const target = path.join(profileRoot, path.basename(url));
  if (fs.existsSync(target)) fs.unlinkSync(target);
}
