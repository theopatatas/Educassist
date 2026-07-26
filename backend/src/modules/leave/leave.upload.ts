import fs from "fs";
import path from "path";
import multer from "multer";
import { randomUUID } from "crypto";

const uploadRoot = path.resolve(process.cwd(), "uploads", "leave-attachments");
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadRoot),
  filename: (_request, file, callback) =>
    callback(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`),
});

const allowed = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export const leaveAttachmentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) =>
    allowed.has(file.mimetype)
      ? callback(null, true)
      : callback(new Error("Allowed attachments: PDF, DOC, DOCX, JPG, JPEG, and PNG.")),
});

export function leaveAttachmentUrl(filename: string) {
  return `/uploads/leave-attachments/${filename}`;
}
