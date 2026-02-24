import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from "./modules/admin/admin.routes";
import usersRoutes from "./modules/users/users.routes";
import studentRoutes from "./modules/student/student.routes";
import teacherRoutes from "./modules/teacher/teacher.routes";
import parentRoutes from "./modules/parent/parent.routes";
import classesRoutes from "./modules/classes/classes.routes";
import quizzesRoutes from "./modules/quizzes/quizzes.routes";
import examsRoutes from "./modules/exams/exams.routes";
import aiRoutes from "./modules/ai/ai.routes";
import assignmentsRoutes from "./modules/assignments/assignments.routes";
import protectedRoutes from "./routes/protected.routes";
import errorHandler from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  const rawCorsOrigins = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  const allowedOrigins = rawCorsOrigins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(compression());
  app.use(morgan("dev"));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/", (_req, res) => res.send("EducAssist API running"));

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/teachers", teacherRoutes);
  app.use("/api/parents", parentRoutes);
  app.use("/api/classes", classesRoutes);
  app.use("/api/quizzes", quizzesRoutes);
  app.use("/api/exams", examsRoutes);
  app.use("/api/assignments", assignmentsRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api", protectedRoutes); // ✅ now GET /api/protected works

  app.use(errorHandler);

  return app;
}
