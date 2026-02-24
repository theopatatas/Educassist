"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExamsForTeacher = listExamsForTeacher;
exports.listExamsForStudent = listExamsForStudent;
exports.createExamForTeacher = createExamForTeacher;
exports.updateExamForTeacher = updateExamForTeacher;
const Class_model_1 = require("../../db/models/Class.model");
const Exam_model_1 = require("../../db/models/Exam.model");
const Section_model_1 = require("../../db/models/Section.model");
const Student_model_1 = require("../../db/models/Student.model");
const Subject_model_1 = require("../../db/models/Subject.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase();
}
function enrollmentKey(sectionId, yearLevel) {
    return `${Number(sectionId ?? 0)}|${normalizeText(yearLevel)}`;
}
function colorForSubject(subjectName) {
    const s = normalizeText(subjectName);
    if (s.includes("science"))
        return "bg-green-500";
    if (s.includes("math"))
        return "bg-blue-500";
    if (s.includes("english"))
        return "bg-purple-500";
    if (s.includes("filipino"))
        return "bg-orange-500";
    return "bg-blue-500";
}
function parseCoverage(input) {
    if (Array.isArray(input))
        return input.map((x) => String(x)).filter(Boolean);
    if (typeof input === "string") {
        try {
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed))
                return parsed.map((x) => String(x)).filter(Boolean);
            return [];
        }
        catch {
            return [];
        }
    }
    return [];
}
async function listExamsForTeacher(userId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const exams = await Exam_model_1.Exam.findAll({ where: { teacherId: teacher.id }, order: [["createdAt", "DESC"]] });
    if (exams.length === 0)
        return [];
    const classIds = exams.map((e) => Number(e.classId)).filter(Boolean);
    const [classes, subjects, sections, students] = await Promise.all([
        classIds.length ? Class_model_1.Class.findAll({ where: { id: classIds } }) : Promise.resolve([]),
        Subject_model_1.Subject.findAll(),
        Section_model_1.Section.findAll(),
        Student_model_1.Student.findAll({ attributes: ["id", "sectionId", "yearLevel"] }),
    ]);
    const classMap = new Map(classes.map((c) => [Number(c.id), c]));
    const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
    const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
    const studentCountMap = new Map();
    for (const s of students) {
        const key = enrollmentKey(s.sectionId, s.yearLevel);
        studentCountMap.set(key, (studentCountMap.get(key) ?? 0) + 1);
    }
    return exams.map((e) => {
        const cls = e.classId ? classMap.get(Number(e.classId)) : null;
        const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
        const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
        const total = cls ? studentCountMap.get(enrollmentKey(cls.sectionId, cls.gradeLevel)) ?? 0 : 0;
        return {
            ...e.toJSON(),
            subjectName,
            sectionName,
            color: colorForSubject(subjectName),
            coverage: parseCoverage(e.coverageJson),
            students: total,
            submissions: { submitted: 0, total },
        };
    });
}
async function listExamsForStudent(userId) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    if (!student.sectionId || !student.yearLevel)
        return [];
    const classesInSection = await Class_model_1.Class.findAll({ where: { sectionId: student.sectionId } });
    const classes = classesInSection.filter((c) => normalizeText(c.gradeLevel) === normalizeText(student.yearLevel));
    const classIds = classes.map((c) => Number(c.id));
    if (classIds.length === 0)
        return [];
    const [exams, subjects, sections, teachers] = await Promise.all([
        Exam_model_1.Exam.findAll({ where: { classId: classIds }, order: [["examDate", "ASC"], ["createdAt", "DESC"]] }),
        Subject_model_1.Subject.findAll(),
        Section_model_1.Section.findAll(),
        Teacher_model_1.Teacher.findAll(),
    ]);
    const classMap = new Map(classes.map((c) => [Number(c.id), c]));
    const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
    const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
    const teacherMap = new Map(teachers.map((t) => [Number(t.id), `${t.firstName} ${t.lastName}`.trim()]));
    return exams.map((e) => {
        const cls = e.classId ? classMap.get(Number(e.classId)) : null;
        const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
        const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
        const teacherName = cls?.teacherId ? teacherMap.get(Number(cls.teacherId)) ?? null : null;
        return {
            ...e.toJSON(),
            subjectName,
            sectionName,
            teacherName,
            color: colorForSubject(subjectName),
            coverage: parseCoverage(e.coverageJson),
        };
    });
}
async function createExamForTeacher(userId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    if (!input.classId)
        return false;
    const cls = await Class_model_1.Class.findByPk(input.classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    const exam = await Exam_model_1.Exam.create({
        teacherId: teacher.id,
        classId: cls.id,
        title: (input.title?.trim() || "Exam").slice(0, 180),
        examDate: input.date,
        startTime: input.startTime?.trim() || null,
        duration: (input.duration?.trim() || "60 mins").slice(0, 40),
        status: input.status || "Scheduled",
        room: input.room?.trim() || null,
        coverageJson: input.coverage ?? [],
        gradingStatus: "Not Started",
        publishResults: false,
    });
    return exam;
}
async function updateExamForTeacher(userId, examId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const exam = await Exam_model_1.Exam.findByPk(examId);
    if (!exam || exam.teacherId !== teacher.id)
        return false;
    await exam.update({
        title: input.title?.trim() ? input.title.trim().slice(0, 180) : exam.title,
        examDate: input.date ?? exam.examDate,
        startTime: input.startTime !== undefined ? input.startTime?.trim() || null : exam.startTime,
        duration: input.duration?.trim() ? input.duration.trim().slice(0, 40) : exam.duration,
        status: input.status ?? exam.status,
        room: input.room !== undefined ? input.room?.trim() || null : exam.room,
        coverageJson: input.coverage ?? exam.coverageJson,
        gradingStatus: input.gradingStatus ?? exam.gradingStatus,
        publishResults: typeof input.publishResults === "boolean" ? input.publishResults : exam.publishResults,
    });
    return exam;
}
