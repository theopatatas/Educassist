"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createParent = createParent;
exports.listParents = listParents;
exports.getParentById = getParentById;
exports.getParentByUserId = getParentByUserId;
exports.getParentOverviewByUserId = getParentOverviewByUserId;
exports.updateParent = updateParent;
exports.deleteParent = deleteParent;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
const Attendance_model_1 = require("../../db/models/Attendance.model");
const calculations_1 = require("../../utils/calculations");
const Class_model_1 = require("../../db/models/Class.model");
const Exam_model_1 = require("../../db/models/Exam.model");
const Grade_model_1 = require("../../db/models/Grade.model");
const GradeItem_model_1 = require("../../db/models/GradeItem.model");
const Parent_model_1 = require("../../db/models/Parent.model");
const QuizAttempt_model_1 = require("../../db/models/QuizAttempt.model");
const Student_model_1 = require("../../db/models/Student.model");
const User_model_1 = require("../../db/models/User.model");
async function createParent(input) {
    return db_1.sequelize.transaction(async (t) => {
        const existing = await User_model_1.User.findOne({
            where: { email: input.email },
            transaction: t,
        });
        if (existing) {
            return {
                ok: false,
                code: 409,
                message: "Email already in use",
            };
        }
        const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
        const user = await User_model_1.User.create({
            email: input.email,
            passwordHash,
            role: "parent",
            refreshTokenHash: null,
        }, { transaction: t });
        const parent = await Parent_model_1.Parent.create({
            userId: user.id,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone ?? null,
            studentId: input.studentId ?? null,
        }, { transaction: t });
        return {
            ok: true,
            parent,
            user: { id: user.id, email: user.email, role: user.role },
        };
    });
}
async function listParents() {
    return Parent_model_1.Parent.findAll({ order: [["createdAt", "DESC"]] });
}
async function getParentById(id) {
    return Parent_model_1.Parent.findByPk(id);
}
async function getParentByUserId(userId) {
    return Parent_model_1.Parent.findOne({ where: { userId } });
}
async function getParentOverviewByUserId(userId) {
    const parent = await Parent_model_1.Parent.findOne({ where: { userId } });
    if (!parent)
        return null;
    if (!parent.studentId) {
        return {
            linkedStudent: null,
            attendance: { present: 0, late: 0, absent: 0, rate: 0 },
            quizzes: { submitted: 0, averageScore: 0 },
            exams: { upcoming: 0, completed: 0 },
            grades: { average: 0, publishedCount: 0 },
            gradeTable: [
                {
                    quarter: "Quarter 1",
                    math: 0,
                    science: 0,
                    english: 0,
                    filipino: 0,
                    mapeh: 0,
                    ap: 0,
                    tle: 0,
                    values: 0,
                },
                {
                    quarter: "Quarter 2",
                    math: 0,
                    science: 0,
                    english: 0,
                    filipino: 0,
                    mapeh: 0,
                    ap: 0,
                    tle: 0,
                    values: 0,
                },
                {
                    quarter: "Quarter 3",
                    math: 0,
                    science: 0,
                    english: 0,
                    filipino: 0,
                    mapeh: 0,
                    ap: 0,
                    tle: 0,
                    values: 0,
                },
                {
                    quarter: "Quarter 4",
                    math: 0,
                    science: 0,
                    english: 0,
                    filipino: 0,
                    mapeh: 0,
                    ap: 0,
                    tle: 0,
                    values: 0,
                },
            ],
        };
    }
    const student = await Student_model_1.Student.findByPk(parent.studentId);
    if (!student) {
        return {
            linkedStudent: null,
            attendance: { present: 0, late: 0, absent: 0, rate: 0 },
            quizzes: { submitted: 0, averageScore: 0 },
            exams: { upcoming: 0, completed: 0 },
            grades: { average: 0, publishedCount: 0 },
            gradeTable: [
                {
                    quarter: "Quarter 1",
                    math: 0,
                    science: 0,
                    english: 0,
                    filipino: 0,
                    mapeh: 0,
                    ap: 0,
                    tle: 0,
                    values: 0,
                },
                {
                    quarter: "Quarter 2",
                    math: 0,
                    science: 0,
                    english: 0,
                    filipino: 0,
                    mapeh: 0,
                    ap: 0,
                    tle: 0,
                    values: 0,
                },
                {
                    quarter: "Quarter 3",
                    math: 0,
                    science: 0,
                    english: 0,
                    filipino: 0,
                    mapeh: 0,
                    ap: 0,
                    tle: 0,
                    values: 0,
                },
                {
                    quarter: "Quarter 4",
                    math: 0,
                    science: 0,
                    english: 0,
                    filipino: 0,
                    mapeh: 0,
                    ap: 0,
                    tle: 0,
                    values: 0,
                },
            ],
        };
    }
    const [attendanceRows, quizAttempts, classes] = await Promise.all([
        Attendance_model_1.Attendance.findAll({ where: { studentId: student.id } }),
        QuizAttempt_model_1.QuizAttempt.findAll({
            where: {
                studentId: student.id,
                completedAt: { [sequelize_1.Op.ne]: null },
            },
        }),
        student.sectionId && student.yearLevel
            ? Class_model_1.Class.findAll({
                where: {
                    sectionId: student.sectionId,
                    gradeLevel: student.yearLevel,
                },
                attributes: ["id"],
            })
            : Promise.resolve([]),
    ]);
    const present = attendanceRows.filter((row) => row.status === "present").length;
    const late = attendanceRows.filter((row) => row.status === "late").length;
    const absent = attendanceRows.filter((row) => row.status === "absent").length;
    const attendanceRate = (0, calculations_1.calculateAttendancePercentage)(present, attendanceRows.length);
    const quizSubmitted = quizAttempts.length;
    const quizAverage = quizSubmitted
        ? Math.round(quizAttempts.reduce((sum, row) => sum + Number(row.score ?? 0), 0) /
            quizSubmitted)
        : 0;
    const classIds = classes.map((row) => Number(row.id));
    const [examRows, gradeItems] = await Promise.all([
        classIds.length
            ? Exam_model_1.Exam.findAll({
                where: { classId: classIds },
                attributes: ["id", "examDate", "status"],
            })
            : Promise.resolve([]),
        classIds.length
            ? GradeItem_model_1.GradeItem.findAll({
                where: {
                    classId: classIds,
                    name: { [sequelize_1.Op.like]: "%|published" },
                },
                attributes: ["id", "name"],
            })
            : Promise.resolve([]),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const upcomingExams = examRows.filter((row) => String(row.examDate) >= today).length;
    const completedExams = examRows.filter((row) => String(row.status).toLowerCase() === "completed").length;
    const gradeItemIds = gradeItems.map((row) => Number(row.id));
    const gradeRows = gradeItemIds.length
        ? await Grade_model_1.Grade.findAll({
            where: {
                studentId: student.id,
                gradeItemId: gradeItemIds,
            },
        })
        : [];
    const subjectKeyMap = {
        math: "math",
        mathematics: "math",
        science: "science",
        english: "english",
        filipino: "filipino",
        mapeh: "mapeh",
        ap: "ap",
        tle: "tle",
        values: "values",
        esp: "values",
        "aralin panlipunan": "ap",
    };
    const gradeTable = [
        {
            quarter: "Quarter 1",
            math: 0,
            science: 0,
            english: 0,
            filipino: 0,
            mapeh: 0,
            ap: 0,
            tle: 0,
            values: 0,
        },
        {
            quarter: "Quarter 2",
            math: 0,
            science: 0,
            english: 0,
            filipino: 0,
            mapeh: 0,
            ap: 0,
            tle: 0,
            values: 0,
        },
        {
            quarter: "Quarter 3",
            math: 0,
            science: 0,
            english: 0,
            filipino: 0,
            mapeh: 0,
            ap: 0,
            tle: 0,
            values: 0,
        },
        {
            quarter: "Quarter 4",
            math: 0,
            science: 0,
            english: 0,
            filipino: 0,
            mapeh: 0,
            ap: 0,
            tle: 0,
            values: 0,
        },
    ];
    const scoreByItemId = new Map(gradeRows.map((row) => [Number(row.gradeItemId), Number(row.score ?? 0)]));
    for (const item of gradeItems) {
        const parts = String(item.name ?? "").split("|");
        if (parts.length < 2)
            continue;
        const termRaw = parts[0]?.trim() || "";
        const subjectRaw = parts[1]?.trim().toLowerCase() || "";
        const quarter = termRaw.startsWith("1")
            ? "Quarter 1"
            : termRaw.startsWith("2")
                ? "Quarter 2"
                : termRaw.startsWith("3")
                    ? "Quarter 3"
                    : termRaw.startsWith("4")
                        ? "Quarter 4"
                        : "";
        const subjectKey = subjectKeyMap[subjectRaw];
        if (!quarter || !subjectKey)
            continue;
        const targetRow = gradeTable.find((row) => row.quarter === quarter);
        if (!targetRow)
            continue;
        targetRow[subjectKey] = scoreByItemId.get(Number(item.id)) ?? 0;
    }
    const publishedCount = gradeRows.length;
    const gradeAverage = publishedCount
        ? Math.round(gradeRows.reduce((sum, row) => sum + Number(row.score ?? 0), 0) /
            publishedCount)
        : 0;
    return {
        linkedStudent: {
            id: Number(student.id),
            name: `${student.firstName} ${student.lastName}`.trim(),
            gradeLevel: student.yearLevel ?? null,
            sectionId: student.sectionId ?? null,
        },
        attendance: { present, late, absent, rate: attendanceRate },
        quizzes: { submitted: quizSubmitted, averageScore: quizAverage },
        exams: { upcoming: upcomingExams, completed: completedExams },
        grades: { average: gradeAverage, publishedCount },
        gradeTable,
    };
}
async function updateParent(id, data) {
    const parent = await Parent_model_1.Parent.findByPk(id);
    if (!parent)
        return null;
    await parent.update({
        firstName: data.firstName ?? parent.firstName,
        lastName: data.lastName ?? parent.lastName,
        phone: data.phone ?? parent.phone,
        studentId: data.studentId ?? parent.studentId,
    });
    return parent;
}
async function deleteParent(id) {
    const parent = await Parent_model_1.Parent.findByPk(id);
    if (!parent)
        return false;
    await parent.destroy();
    return true;
}
