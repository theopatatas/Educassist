"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const student_routes_1 = __importDefault(require("./modules/student/student.routes"));
const teacher_routes_1 = __importDefault(require("./modules/teacher/teacher.routes"));
const parent_routes_1 = __importDefault(require("./modules/parent/parent.routes"));
const classes_routes_1 = __importDefault(require("./modules/classes/classes.routes"));
const quizzes_routes_1 = __importDefault(require("./modules/quizzes/quizzes.routes"));
const exams_routes_1 = __importDefault(require("./modules/exams/exams.routes"));
const ai_routes_1 = __importDefault(require("./modules/ai/ai.routes"));
const assignments_routes_1 = __importDefault(require("./modules/assignments/assignments.routes"));
const protected_routes_1 = __importDefault(require("./routes/protected.routes"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
function createApp() {
    const app = (0, express_1.default)();
    const rawCorsOrigins = process.env.CORS_ORIGIN ?? "http://localhost:3000";
    const allowedOrigins = rawCorsOrigins
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin(origin, callback) {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin))
                return callback(null, true);
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
    }));
    app.use((0, compression_1.default)());
    app.use((0, morgan_1.default)("dev"));
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => res.json({ ok: true }));
    app.get("/", (_req, res) => res.send("EducAssist API running"));
    app.use("/api/auth", auth_routes_1.default);
    app.use("/api/admin", admin_routes_1.default);
    app.use("/api/users", users_routes_1.default);
    app.use("/api/students", student_routes_1.default);
    app.use("/api/teachers", teacher_routes_1.default);
    app.use("/api/parents", parent_routes_1.default);
    app.use("/api/classes", classes_routes_1.default);
    app.use("/api/quizzes", quizzes_routes_1.default);
    app.use("/api/exams", exams_routes_1.default);
    app.use("/api/assignments", assignments_routes_1.default);
    app.use("/api/ai", ai_routes_1.default);
    app.use("/api", protected_routes_1.default); // ✅ now GET /api/protected works
    app.use(errorHandler_1.default);
    return app;
}
