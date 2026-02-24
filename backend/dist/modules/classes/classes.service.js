"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClassesForTeacher = listClassesForTeacher;
exports.listClassesForStudent = listClassesForStudent;
exports.createClassForTeacher = createClassForTeacher;
exports.updateClassForTeacher = updateClassForTeacher;
exports.deleteClassForTeacher = deleteClassForTeacher;
exports.listStudentsForTeacherClass = listStudentsForTeacherClass;
exports.listAttendanceForTeacher = listAttendanceForTeacher;
exports.listAttendanceForStudent = listAttendanceForStudent;
exports.saveAttendanceForTeacher = saveAttendanceForTeacher;
exports.savePublishedGradesForTeacher = savePublishedGradesForTeacher;
exports.getPublishedGradesForStudent = getPublishedGradesForStudent;
exports.getPublishedGradesForTeacher = getPublishedGradesForTeacher;
const sequelize_1 = require("sequelize");
const Class_model_1 = require("../../db/models/Class.model");
const Attendance_model_1 = require("../../db/models/Attendance.model");
const Grade_model_1 = require("../../db/models/Grade.model");
const GradeItem_model_1 = require("../../db/models/GradeItem.model");
const Section_model_1 = require("../../db/models/Section.model");
const Student_model_1 = require("../../db/models/Student.model");
const Subject_model_1 = require("../../db/models/Subject.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
const SUBJECT_KEY_TO_NAME = {
    math: "Math",
    mathematics: "Math",
    science: "Science",
    english: "English",
    filipino: "Filipino",
    mapeh: "MAPEH",
    ap: "AP",
    tle: "TLE",
    values: "Values",
    esp: "Values",
};
const SUBJECT_ALIAS_TO_KEY = {
    math: "math",
    mathematics: "math",
    science: "science",
    english: "english",
    filipino: "filipino",
    mapeh: "mapeh",
    ap: "ap",
    "aralin panlipunan": "ap",
    tle: "tle",
    values: "values",
    esp: "values",
};
function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}
function normalizeSubjectName(subject) {
    const key = normalizeText(subject);
    return SUBJECT_KEY_TO_NAME[key] ?? subject.trim();
}
function toSubjectKey(subject) {
    const key = normalizeText(subject);
    return SUBJECT_ALIAS_TO_KEY[key] ?? null;
}
function quarterFromTerm(term) {
    const normalized = normalizeText(term);
    if (normalized.startsWith("1"))
        return "Quarter 1";
    if (normalized.startsWith("2"))
        return "Quarter 2";
    if (normalized.startsWith("3"))
        return "Quarter 3";
    if (normalized.startsWith("4"))
        return "Quarter 4";
    return null;
}
function parseGradeItemName(name) {
    const parts = String(name ?? "").split("|");
    const term = (parts[0] ?? "").trim();
    const subjectRaw = (parts[1] ?? "").trim();
    const state = normalizeText(parts[2] ?? "draft");
    const subjectKey = toSubjectKey(subjectRaw);
    if (!term || !subjectKey)
        return null;
    return {
        term,
        subjectKey,
        published: state === "published",
    };
}
async function listClassesForTeacher(userId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const classes = await Class_model_1.Class.findAll({ where: { teacherId: teacher.id }, order: [["createdAt", "DESC"]] });
    if (classes.length === 0)
        return [];
    const sectionIds = classes.map((c) => c.sectionId).filter(Boolean);
    const subjectIds = classes.map((c) => c.subjectId).filter(Boolean);
    const gradeLevels = classes.map((c) => c.gradeLevel).filter(Boolean);
    const [sections, subjects, students] = await Promise.all([
        sectionIds.length ? Section_model_1.Section.findAll({ where: { id: sectionIds } }) : Promise.resolve([]),
        subjectIds.length ? Subject_model_1.Subject.findAll({ where: { id: subjectIds } }) : Promise.resolve([]),
        sectionIds.length && gradeLevels.length
            ? Student_model_1.Student.findAll({
                where: {
                    sectionId: sectionIds,
                    yearLevel: gradeLevels,
                },
                attributes: ["sectionId", "yearLevel"],
            })
            : Promise.resolve([]),
    ]);
    const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
    const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
    const studentCountMap = new Map();
    for (const student of students) {
        const key = `${student.sectionId ?? ""}|${student.yearLevel ?? ""}`;
        studentCountMap.set(key, (studentCountMap.get(key) ?? 0) + 1);
    }
    return classes.map((c) => ({
        ...c.toJSON(),
        sectionName: c.sectionId ? sectionMap.get(Number(c.sectionId)) ?? null : null,
        subjectName: c.subjectId ? subjectMap.get(Number(c.subjectId)) ?? null : null,
        enrolledStudents: studentCountMap.get(`${c.sectionId ?? ""}|${c.gradeLevel ?? ""}`) ?? 0,
    }));
}
async function listClassesForStudent(userId) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    if (!student.sectionId || !student.yearLevel)
        return [];
    const classes = await Class_model_1.Class.findAll({
        where: {
            sectionId: student.sectionId,
            gradeLevel: student.yearLevel,
        },
        order: [["createdAt", "DESC"]],
    });
    if (classes.length === 0)
        return [];
    const teacherIds = classes.map((c) => c.teacherId).filter(Boolean);
    const subjectIds = classes.map((c) => c.subjectId).filter(Boolean);
    const [teachers, subjects] = await Promise.all([
        teacherIds.length ? Teacher_model_1.Teacher.findAll({ where: { id: teacherIds } }) : Promise.resolve([]),
        subjectIds.length ? Subject_model_1.Subject.findAll({ where: { id: subjectIds } }) : Promise.resolve([]),
    ]);
    const teacherMap = new Map(teachers.map((t) => [Number(t.id), `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim() || "Teacher"]));
    const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
    return classes.map((c) => ({
        ...c.toJSON(),
        teacherName: teacherMap.get(Number(c.teacherId)) ?? "Teacher",
        subjectName: c.subjectId ? subjectMap.get(Number(c.subjectId)) ?? null : null,
    }));
}
async function createClassForTeacher(userId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    let subjectId = input.subjectId ?? null;
    if (!subjectId && input.subjectName?.trim()) {
        const normalizedSubject = input.subjectName.trim();
        const existingSubject = await Subject_model_1.Subject.findOne({ where: { name: normalizedSubject } });
        const subject = existingSubject ?? (await Subject_model_1.Subject.create({ name: normalizedSubject, code: null }));
        subjectId = subject.id;
    }
    let sectionId = input.sectionId ?? null;
    if (!sectionId && input.className?.trim()) {
        const sectionName = input.className.trim();
        const [section] = await Section_model_1.Section.findOrCreate({
            where: { name: sectionName },
            defaults: { name: sectionName },
        });
        sectionId = Number(section.id);
    }
    const resolvedClassName = (input.className ?? input.subjectName ?? null)?.toString().slice(0, 120) ?? null;
    const meetingDay = input.meetingDay?.toString().slice(0, 20) ?? null;
    const meetingTime = input.meetingTime?.toString().slice(0, 20) ?? null;
    const cls = await Class_model_1.Class.create({
        teacherId: teacher.id,
        name: resolvedClassName,
        subjectId: subjectId ?? null,
        sectionId,
        gradeLevel: input.gradeLevel ?? null,
        meetingDay,
        meetingTime,
    });
    return cls;
}
async function updateClassForTeacher(userId, classId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const cls = await Class_model_1.Class.findByPk(classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    let subjectId = input.subjectId ?? cls.subjectId ?? null;
    if (!input.subjectId && input.subjectName?.trim()) {
        const normalizedSubject = input.subjectName.trim();
        const existingSubject = await Subject_model_1.Subject.findOne({ where: { name: normalizedSubject } });
        const subject = existingSubject ?? (await Subject_model_1.Subject.create({ name: normalizedSubject, code: null }));
        subjectId = subject.id;
    }
    let sectionId = input.sectionId ?? cls.sectionId ?? null;
    if (!input.sectionId && input.className?.trim()) {
        const sectionName = input.className.trim();
        const [section] = await Section_model_1.Section.findOrCreate({
            where: { name: sectionName },
            defaults: { name: sectionName },
        });
        sectionId = Number(section.id);
    }
    const resolvedClassName = (input.className ?? input.subjectName ?? cls.name)?.toString().slice(0, 120) ?? null;
    const meetingDay = (input.meetingDay ?? cls.meetingDay)?.toString().slice(0, 20) ?? null;
    const meetingTime = (input.meetingTime ?? cls.meetingTime)?.toString().slice(0, 20) ?? null;
    await cls.update({
        subjectId,
        sectionId,
        gradeLevel: input.gradeLevel ?? cls.gradeLevel,
        name: resolvedClassName,
        meetingDay,
        meetingTime,
    });
    return cls;
}
async function deleteClassForTeacher(userId, classId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const cls = await Class_model_1.Class.findByPk(classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    const subjectId = cls.subjectId;
    await cls.destroy();
    // If no class is using this subject anymore, remove it from the subjects table.
    if (subjectId) {
        const remaining = await Class_model_1.Class.count({ where: { subjectId } });
        if (remaining === 0) {
            await Subject_model_1.Subject.destroy({ where: { id: subjectId } });
        }
    }
    return true;
}
async function listStudentsForTeacherClass(userId, classId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const cls = await Class_model_1.Class.findByPk(classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    if (!cls.sectionId || !cls.gradeLevel)
        return [];
    const students = await Student_model_1.Student.findAll({
        where: {
            sectionId: cls.sectionId,
            yearLevel: cls.gradeLevel,
        },
        order: [["lastName", "ASC"], ["firstName", "ASC"]],
    });
    return students.map((s) => s.toJSON());
}
async function listAttendanceForTeacher(userId, filter) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const classes = await Class_model_1.Class.findAll({ where: { teacherId: teacher.id } });
    const classIds = classes.map((c) => Number(c.id));
    if (classIds.length === 0)
        return [];
    const where = { classId: classIds };
    if (filter?.date)
        where.date = filter.date;
    const rows = await Attendance_model_1.Attendance.findAll({ where, order: [["date", "DESC"]] });
    return rows.map((r) => r.toJSON());
}
async function listAttendanceForStudent(userId) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    const rows = await Attendance_model_1.Attendance.findAll({
        where: { studentId: student.id },
        order: [["date", "DESC"]],
    });
    return rows.map((r) => r.toJSON());
}
async function saveAttendanceForTeacher(userId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const classes = await Class_model_1.Class.findAll({ where: { teacherId: teacher.id } });
    const allowedClassIds = new Set(classes.map((c) => Number(c.id)));
    const countByKey = new Map();
    for (const record of input.records) {
        const classId = Number(record.classId);
        const studentId = Number(record.studentId);
        if (!allowedClassIds.has(classId))
            continue;
        if (!studentId || !record.status)
            continue;
        const key = `${classId}|${studentId}|${input.date}`;
        countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
        await Attendance_model_1.Attendance.upsert({
            classId,
            studentId,
            date: input.date,
            status: record.status,
        });
    }
    return countByKey.size;
}
async function savePublishedGradesForTeacher(userId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const subjectName = normalizeSubjectName(input.subject);
    const subjectKey = toSubjectKey(input.subject);
    if (!subjectKey)
        return false;
    const classes = await Class_model_1.Class.findAll({ where: { teacherId: teacher.id } });
    const classIds = classes
        .filter((cls) => {
        const sectionOk = normalizeText(cls.name) === normalizeText(input.section);
        const gradeOk = normalizeText(cls.gradeLevel) === normalizeText(input.gradeLevel);
        return sectionOk && gradeOk;
    })
        .map((cls) => Number(cls.id));
    if (!classIds.length)
        return false;
    const subjects = await Subject_model_1.Subject.findAll();
    const subjectById = new Map(subjects.map((s) => [Number(s.id), s.name]));
    const targetClass = classes.find((cls) => {
        if (!classIds.includes(Number(cls.id)))
            return false;
        const clsSubject = cls.subjectId ? subjectById.get(Number(cls.subjectId)) : null;
        return !!clsSubject && toSubjectKey(clsSubject) === subjectKey;
    });
    if (!targetClass)
        return false;
    const classId = Number(targetClass.id);
    const draftName = `${input.term}|${subjectName}|draft`;
    const publishName = `${input.term}|${subjectName}|published`;
    const existingItems = await GradeItem_model_1.GradeItem.findAll({
        where: {
            classId,
            name: { [sequelize_1.Op.like]: `${input.term}|%` },
        },
    });
    const existing = existingItems.find((item) => {
        const parsed = parseGradeItemName(item.name);
        return !!parsed && parsed.subjectKey === subjectKey;
    });
    const gradeItem = existing ??
        (await GradeItem_model_1.GradeItem.create({
            classId,
            name: draftName,
            weight: 1,
            maxScore: 100,
            dueDate: null,
        }));
    if (gradeItem.name !== (input.publish ? publishName : draftName)) {
        await gradeItem.update({ name: input.publish ? publishName : draftName });
    }
    let saved = 0;
    for (const row of input.rows) {
        const studentId = Number(row.studentId);
        if (!studentId)
            continue;
        const score = Number.isFinite(Number(row.score)) ? Number(row.score) : 0;
        await Grade_model_1.Grade.upsert({
            gradeItemId: Number(gradeItem.id),
            studentId,
            score,
        });
        saved += 1;
    }
    return saved;
}
async function getPublishedGradesForStudent(userId, filter) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    const rows = [
        { id: 1, name: "Quarter 1", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
        { id: 2, name: "Quarter 2", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
        { id: 3, name: "Quarter 3", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
        { id: 4, name: "Quarter 4", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    ];
    const targetQuarter = filter?.term ? quarterFromTerm(filter.term) : null;
    if (!student.sectionId || !student.yearLevel)
        return rows;
    const classes = await Class_model_1.Class.findAll({
        where: {
            sectionId: student.sectionId,
            gradeLevel: student.yearLevel,
        },
        attributes: ["id"],
    });
    const classIds = classes.map((c) => Number(c.id));
    if (!classIds.length)
        return rows;
    const gradeItems = await GradeItem_model_1.GradeItem.findAll({
        where: {
            classId: classIds,
            name: { [sequelize_1.Op.like]: "%|published" },
        },
    });
    const itemIds = gradeItems.map((g) => Number(g.id));
    if (!itemIds.length)
        return rows;
    const grades = await Grade_model_1.Grade.findAll({
        where: {
            studentId: Number(student.id),
            gradeItemId: itemIds,
        },
    });
    const scoreByItemId = new Map(grades.map((g) => [Number(g.gradeItemId), Number(g.score)]));
    for (const item of gradeItems) {
        const parsed = parseGradeItemName(item.name);
        if (!parsed || !parsed.published)
            continue;
        const quarter = quarterFromTerm(parsed.term);
        if (!quarter)
            continue;
        if (targetQuarter && quarter !== targetQuarter)
            continue;
        const row = rows.find((r) => r.name === quarter);
        if (!row)
            continue;
        const mapped = parsed.subjectKey;
        const score = scoreByItemId.get(Number(item.id)) ?? 0;
        row[mapped] = score;
    }
    return rows;
}
async function getPublishedGradesForTeacher(userId, filter) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const classes = await Class_model_1.Class.findAll({ where: { teacherId: teacher.id } });
    const section = normalizeText(filter.section);
    const gradeLevel = normalizeText(filter.gradeLevel);
    const classIds = classes
        .filter((cls) => {
        const sectionOk = !section || section === "all sections" || normalizeText(cls.name) === section;
        const gradeOk = !gradeLevel || gradeLevel === "all grades" || normalizeText(cls.gradeLevel) === gradeLevel;
        return sectionOk && gradeOk;
    })
        .map((cls) => Number(cls.id));
    if (!classIds.length)
        return [];
    const whereName = filter.term ? { [sequelize_1.Op.like]: `${filter.term}|%|published` } : { [sequelize_1.Op.like]: `%|published` };
    const items = await GradeItem_model_1.GradeItem.findAll({ where: { classId: classIds, name: whereName } });
    if (!items.length)
        return [];
    const itemIds = items.map((i) => Number(i.id));
    const grades = await Grade_model_1.Grade.findAll({ where: { gradeItemId: itemIds } });
    return grades.map((g) => g.toJSON());
}
