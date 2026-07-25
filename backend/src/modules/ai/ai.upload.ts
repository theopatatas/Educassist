import multer from "multer";

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

export const aiAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_request, file, callback) => {
    if (allowedTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(
      new Error(
        "Unsupported attachment. Upload an image, PDF, text, CSV, JSON, Markdown, or DOCX file.",
      ),
    );
  },
});
