"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createParent = createParent;
exports.listParents = listParents;
exports.getParentById = getParentById;
exports.getParentByUserId = getParentByUserId;
exports.getParentLinkedStudentsByUserId = getParentLinkedStudentsByUserId;
exports.parentCanAccessStudent = parentCanAccessStudent;
exports.getParentSelectedStudentByUserId = getParentSelectedStudentByUserId;
exports.getParentAcademicSessionsByUserId = getParentAcademicSessionsByUserId;
exports.getParentAcademicRecordByUserId = getParentAcademicRecordByUserId;
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
const ParentStudent_model_1 = require("../../db/models/ParentStudent.model");
const Section_model_1 = require("../../db/models/Section.model");
const QuizAttempt_model_1 = require("../../db/models/QuizAttempt.model");
const Student_model_1 = require("../../db/models/Student.model");
const User_model_1 = require("../../db/models/User.model");
const settings_service_1 = require("../admin/settings.service");
const student_service_1 = require("../student/student.service");
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
        if (input.studentId) {
            await ParentStudent_model_1.ParentStudent.findOrCreate({
                where: {
                    parentId: parent.id,
                    studentId: Number(input.studentId),
                },
                defaults: {
                    parentId: parent.id,
                    studentId: Number(input.studentId),
                },
                transaction: t,
            });
        }
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
async function linkedStudentIds(parent) {
    const links = await ParentStudent_model_1.ParentStudent.findAll({
        where: { parentId: parent.id },
        attributes: ["studentId"],
    });
    const ids = links.map((link) => Number(link.studentId));
    if (parent.studentId)
        ids.push(Number(parent.studentId));
    return [...new Set(ids.filter(Boolean))];
}
async function getParentLinkedStudentsByUserId(userId) {
    const parent = await Parent_model_1.Parent.findOne({ where: { userId } });
    if (!parent)
        return null;
    const ids = await linkedStudentIds(parent);
    if (!ids.length)
        return [];
    const students = await Student_model_1.Student.findAll({
        where: { id: ids },
        attributes: [
            "id",
            "firstName",
            "middleName",
            "lastName",
            "yearLevel",
            "sectionId",
            "graduatedAt",
            "archivedAt",
        ],
    });
    const sectionIds = students
        .map((student) => Number(student.sectionId))
        .filter(Boolean);
    const sections = sectionIds.length
        ? await Section_model_1.Section.findAll({
            where: { id: sectionIds },
            attributes: ["id", "name"],
        })
        : [];
    const sectionNames = new Map(sections.map((section) => [Number(section.id), section.name]));
    return students
        .map((student) => ({
        id: Number(student.id),
        name: [student.firstName, student.middleName, student.lastName]
            .filter(Boolean)
            .join(" "),
        gradeLevel: student.yearLevel ?? null,
        sectionId: student.sectionId ? Number(student.sectionId) : null,
        sectionName: student.sectionId
            ? sectionNames.get(Number(student.sectionId)) ?? null
            : null,
        graduated: Boolean(student.graduatedAt),
        archived: Boolean(student.archivedAt),
        primary: Number(parent.studentId) === Number(student.id),
    }))
        .sort((left, right) => {
        if (left.primary !== right.primary)
            return left.primary ? -1 : 1;
        if (left.archived !== right.archived)
            return left.archived ? 1 : -1;
        return left.name.localeCompare(right.name);
    });
}
async function resolveParentStudent(parent, requestedStudentId) {
    const ids = await linkedStudentIds(parent);
    if (!ids.length)
        return { student: null, allowed: true };
    const requested = requestedStudentId ? Number(requestedStudentId) : null;
    if (requested && !ids.includes(requested))
        return { student: null, allowed: false };
    const selectedId = requested ||
        (parent.studentId && ids.includes(Number(parent.studentId))
            ? Number(parent.studentId)
            : ids[0]);
    return {
        student: await Student_model_1.Student.findByPk(selectedId),
        allowed: true,
    };
}
async function parentCanAccessStudent(userId, requestedStudentId) {
    const parent = await Parent_model_1.Parent.findOne({ where: { userId } });
    if (!parent)
        return null;
    const selected = await resolveParentStudent(parent, requestedStudentId);
    return selected.allowed;
}
async function getParentSelectedStudentByUserId(userId, requestedStudentId) {
    const parent = await Parent_model_1.Parent.findOne({ where: { userId } });
    if (!parent)
        return null;
    const selected = await resolveParentStudent(parent, requestedStudentId);
    if (!selected.allowed)
        return { forbidden: true };
    if (!selected.student)
        return { student: null };
    const section = selected.student.sectionId
        ? await Section_model_1.Section.findByPk(selected.student.sectionId, {
            attributes: ["id", "name"],
        })
        : null;
    return {
        student: {
            id: Number(selected.student.id),
            gradeLevel: selected.student.yearLevel ?? null,
            sectionId: selected.student.sectionId
                ? Number(selected.student.sectionId)
                : null,
            sectionName: section?.name ?? null,
        },
    };
}
async function getParentAcademicSessionsByUserId(userId, requestedStudentId) {
    const parent = await Parent_model_1.Parent.findOne({ where: { userId } });
    if (!parent)
        return null;
    const selected = await resolveParentStudent(parent, requestedStudentId);
    if (!selected.allowed)
        return { forbidden: true };
    if (!selected.student)
        return [];
    return (0, student_service_1.getStudentAcademicSessionsById)(String(selected.student.id));
}
async function getParentAcademicRecordByUserId(userId, filter) {
    const parent = await Parent_model_1.Parent.findOne({ where: { userId } });
    if (!parent)
        return null;
    const selected = await resolveParentStudent(parent, filter?.studentId);
    if (!selected.allowed)
        return { forbidden: true };
    if (!selected.student)
        return { linkedStudent: false, record: null };
    const record = await (0, student_service_1.getStudentAcademicRecordById)(String(selected.student.id), filter);
    return { linkedStudent: true, record };
}
async function getParentOverviewByUserId(userId, requestedStudentId) {
    const academic = await (0, settings_service_1.getAcademicContext)();
    const parent = await Parent_model_1.Parent.findOne({ where: { userId } });
    if (!parent)
        return null;
    const selected = await resolveParentStudent(parent, requestedStudentId);
    if (!selected.allowed)
        return { forbidden: true };
    if (!selected.student) {
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
    const student = selected.student;
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
                    ...(academic.currentSchoolYear
                        ? { academicYear: academic.currentSchoolYear }
                        : {}),
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
    const quarterlyScores = new Map();
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
        const score = scoreByItemId.get(Number(item.id));
        if (score === undefined)
            continue;
        targetRow[subjectKey] = score;
        const subjectScores = quarterlyScores.get(subjectKey) ?? new Map();
        subjectScores.set(quarter, score);
        quarterlyScores.set(subjectKey, subjectScores);
    }
    const publishedCount = gradeRows.length;
    const gradeAverage = publishedCount
        ? Math.round(gradeRows.reduce((sum, row) => sum + Number(row.score ?? 0), 0) /
            publishedCount)
        : 0;
    const finalSubjectAverages = {};
    const finalCandidates = [];
    for (const [subject, scores] of quarterlyScores) {
        const values = [
            scores.get("Quarter 1"),
            scores.get("Quarter 2"),
            scores.get("Quarter 3"),
            scores.get("Quarter 4"),
        ];
        const average = (0, calculations_1.calculateFinalSubjectAverage)(values);
        finalCandidates.push(average);
        if (average !== null)
            finalSubjectAverages[subject] = average;
    }
    const overallAverage = (0, calculations_1.calculateOverallStudentAverage)(finalCandidates);
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
        grades: {
            average: gradeAverage,
            publishedCount,
            finalSubjectAverages,
            overallAverage,
        },
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
    if (data.studentId) {
        await ParentStudent_model_1.ParentStudent.findOrCreate({
            where: { parentId: parent.id, studentId: Number(data.studentId) },
            defaults: { parentId: parent.id, studentId: Number(data.studentId) },
        });
    }
    return parent;
}
async function deleteParent(id) {
    const parent = await Parent_model_1.Parent.findByPk(id);
    if (!parent)
        return false;
    await parent.destroy();
    return true;
}
