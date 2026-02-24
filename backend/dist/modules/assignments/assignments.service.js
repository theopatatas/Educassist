"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssignmentsForTeacher = listAssignmentsForTeacher;
exports.listAssignmentsForStudent = listAssignmentsForStudent;
exports.createAssignmentForTeacher = createAssignmentForTeacher;
exports.submitAssignmentForStudent = submitAssignmentForStudent;
exports.listAssignmentResultsForTeacher = listAssignmentResultsForTeacher;
const Assignment_model_1 = require("../../db/models/Assignment.model");
const AssignmentSubmission_model_1 = require("../../db/models/AssignmentSubmission.model");
const Class_model_1 = require("../../db/models/Class.model");
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
        return "green";
    if (s.includes("math"))
        return "blue";
    if (s.includes("english"))
        return "purple";
    return "blue";
}
async function listAssignmentsForTeacher(userId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const assignments = await Assignment_model_1.Assignment.findAll({
        where: { teacherId: teacher.id },
        order: [["createdAt", "DESC"]],
    });
    if (assignments.length === 0)
        return [];
    const classIds = assignments.map((a) => Number(a.classId)).filter(Boolean);
    const [classes, subjects, sections, students] = await Promise.all([
        classIds.length ? Class_model_1.Class.findAll({ where: { id: classIds } }) : Promise.resolve([]),
        Subject_model_1.Subject.findAll(),
        Section_model_1.Section.findAll(),
        Student_model_1.Student.findAll({ attributes: ["sectionId", "yearLevel"] }),
    ]);
    const assignmentIds = assignments.map((a) => Number(a.id));
    const submissionRows = assignmentIds.length > 0
        ? await AssignmentSubmission_model_1.AssignmentSubmission.findAll({ where: { assignmentId: assignmentIds } })
        : [];
    const classMap = new Map(classes.map((c) => [Number(c.id), c]));
    const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
    const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
    const studentCountMap = new Map();
    for (const s of students) {
        const key = enrollmentKey(s.sectionId, s.yearLevel);
        studentCountMap.set(key, (studentCountMap.get(key) ?? 0) + 1);
    }
    return assignments.map((a) => {
        const cls = a.classId ? classMap.get(Number(a.classId)) : null;
        const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
        const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
        const total = cls ? studentCountMap.get(enrollmentKey(cls.sectionId, cls.gradeLevel)) ?? 0 : 0;
        const submitted = submissionRows.filter((s) => Number(s.assignmentId) === Number(a.id) && !!s.submittedAt).length;
        return {
            ...a.toJSON(),
            subjectName,
            sectionName,
            color: colorForSubject(subjectName),
            submissions: { submitted, total },
        };
    });
}
async function listAssignmentsForStudent(userId) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    if (!student.sectionId || !student.yearLevel)
        return [];
    const classesBySection = await Class_model_1.Class.findAll({ where: { sectionId: student.sectionId } });
    const classes = classesBySection.filter((c) => normalizeText(c.gradeLevel) === normalizeText(student.yearLevel));
    const classIds = classes.map((c) => Number(c.id));
    if (classIds.length === 0)
        return [];
    const [assignments, subjects, sections, teachers] = await Promise.all([
        Assignment_model_1.Assignment.findAll({ where: { classId: classIds }, order: [["dueDate", "ASC"], ["createdAt", "DESC"]] }),
        Subject_model_1.Subject.findAll(),
        Section_model_1.Section.findAll(),
        Teacher_model_1.Teacher.findAll(),
    ]);
    const assignmentIds = assignments.map((a) => Number(a.id));
    const submissionRows = assignmentIds.length > 0
        ? await AssignmentSubmission_model_1.AssignmentSubmission.findAll({ where: { assignmentId: assignmentIds, studentId: student.id } })
        : [];
    const submissionMap = new Map(submissionRows.map((s) => [Number(s.assignmentId), s]));
    const classMap = new Map(classes.map((c) => [Number(c.id), c]));
    const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
    const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
    const teacherMap = new Map(teachers.map((t) => [Number(t.id), `${t.firstName} ${t.lastName}`.trim()]));
    return assignments.map((a) => {
        const cls = a.classId ? classMap.get(Number(a.classId)) : null;
        const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
        const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
        const teacherName = cls?.teacherId ? teacherMap.get(Number(cls.teacherId)) ?? null : null;
        const mySubmission = submissionMap.get(Number(a.id));
        return {
            ...a.toJSON(),
            subjectName,
            sectionName,
            teacherName,
            color: colorForSubject(subjectName),
            mySubmitted: !!mySubmission?.submittedAt,
        };
    });
}
async function createAssignmentForTeacher(userId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    if (!input.classId || !input.title?.trim() || !input.dueDate)
        return false;
    const cls = await Class_model_1.Class.findByPk(input.classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    const assignment = await Assignment_model_1.Assignment.create({
        teacherId: teacher.id,
        classId: cls.id,
        title: input.title.trim().slice(0, 180),
        dueDate: input.dueDate,
        status: input.status || "Active",
        description: input.description?.trim() || null,
    });
    return assignment;
}
async function submitAssignmentForStudent(userId, assignmentId) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    const assignment = await Assignment_model_1.Assignment.findByPk(assignmentId);
    if (!assignment || !assignment.classId)
        return false;
    const cls = await Class_model_1.Class.findByPk(assignment.classId);
    if (!cls || !student.sectionId || !student.yearLevel || !cls.sectionId || !cls.gradeLevel)
        return false;
    const sectionOk = Number(student.sectionId) === Number(cls.sectionId);
    const levelOk = normalizeText(student.yearLevel) === normalizeText(cls.gradeLevel);
    if (!sectionOk || !levelOk)
        return false;
    const existing = await AssignmentSubmission_model_1.AssignmentSubmission.findOne({
        where: { assignmentId: Number(assignment.id), studentId: Number(student.id) },
    });
    if (existing) {
        await existing.update({ submittedAt: existing.submittedAt ?? new Date() });
        return existing;
    }
    return AssignmentSubmission_model_1.AssignmentSubmission.create({
        assignmentId: Number(assignment.id),
        studentId: Number(student.id),
        submittedAt: new Date(),
    });
}
async function listAssignmentResultsForTeacher(userId, assignmentId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const assignment = await Assignment_model_1.Assignment.findByPk(assignmentId);
    if (!assignment || !assignment.classId)
        return false;
    const cls = await Class_model_1.Class.findByPk(assignment.classId);
    if (!cls || cls.teacherId !== teacher.id || !cls.sectionId || !cls.gradeLevel)
        return false;
    const studentsInSection = await Student_model_1.Student.findAll({
        where: { sectionId: cls.sectionId },
        order: [["lastName", "ASC"], ["firstName", "ASC"]],
    });
    const enrolledStudents = studentsInSection.filter((s) => normalizeText(s.yearLevel) === normalizeText(cls.gradeLevel));
    const submissions = await AssignmentSubmission_model_1.AssignmentSubmission.findAll({
        where: { assignmentId: Number(assignment.id) },
        order: [["updatedAt", "DESC"]],
    });
    const submissionMap = new Map();
    for (const sub of submissions) {
        submissionMap.set(Number(sub.studentId), sub);
    }
    const rows = enrolledStudents.map((s) => {
        const sub = submissionMap.get(Number(s.id));
        return {
            studentId: Number(s.id),
            studentName: `${s.lastName}, ${s.firstName}`,
            status: sub?.submittedAt ? "Submitted" : "Not Submitted",
            submittedAt: sub?.submittedAt ?? null,
        };
    });
    const submitted = rows.filter((r) => r.status === "Submitted").length;
    const total = rows.length;
    return {
        submitted,
        total,
        rows,
    };
}
