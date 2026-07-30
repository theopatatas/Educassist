"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClassesForTeacher = listClassesForTeacher;
exports.listClassesForStudent = listClassesForStudent;
exports.getClassFormOptionsForTeacher = getClassFormOptionsForTeacher;
exports.createClassForTeacher = createClassForTeacher;
exports.updateClassForTeacher = updateClassForTeacher;
exports.deleteClassForTeacher = deleteClassForTeacher;
exports.listStudentsForTeacherClass = listStudentsForTeacherClass;
exports.listAttendanceForTeacher = listAttendanceForTeacher;
exports.listAttendanceForStudent = listAttendanceForStudent;
exports.saveAttendanceForTeacher = saveAttendanceForTeacher;
exports.savePublishedGradesForTeacher = savePublishedGradesForTeacher;
exports.getAcademicSessionsForStudent = getAcademicSessionsForStudent;
exports.getAcademicSessionsForTeacher = getAcademicSessionsForTeacher;
exports.getPublishedGradesForStudent = getPublishedGradesForStudent;
exports.getPublishedGradesForTeacher = getPublishedGradesForTeacher;
const sequelize_1 = require("sequelize");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../../config/db");
const Class_model_1 = require("../../db/models/Class.model");
const Attendance_model_1 = require("../../db/models/Attendance.model");
const Grade_model_1 = require("../../db/models/Grade.model");
const GradeItem_model_1 = require("../../db/models/GradeItem.model");
const Section_model_1 = require("../../db/models/Section.model");
const Student_model_1 = require("../../db/models/Student.model");
const Subject_model_1 = require("../../db/models/Subject.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
const User_model_1 = require("../../db/models/User.model");
const settings_service_1 = require("../admin/settings.service");
const calculations_1 = require("../../utils/calculations");
const academic_terms_1 = require("../../utils/academic-terms");
const schedule_conflict_1 = require("./schedule-conflict");
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
const WEEKDAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
function serializeMeetingDays(input) {
    const rawDays = Array.isArray(input)
        ? input
        : String(input ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    const seen = new Set();
    for (const day of rawDays) {
        const normalized = String(day).trim();
        if (WEEKDAY_OPTIONS.includes(normalized)) {
            seen.add(normalized);
        }
    }
    return Array.from(seen).join(",");
}
function normalizeSubjectName(subject) {
    const key = normalizeText(subject);
    return SUBJECT_KEY_TO_NAME[key] ?? subject.trim();
}
async function scheduleValidation(teacherId, academicYear, meetingDay, meetingTime, transaction, excludeClassId) {
    const hasScheduleInput = Boolean(meetingDay || meetingTime);
    if (!hasScheduleInput)
        return null;
    if (!academicYear) {
        return {
            error: "academic_year_unavailable",
            status: 422,
            message: "A current academic year must be configured before creating a class schedule.",
        };
    }
    const candidate = (0, schedule_conflict_1.parseClassSchedule)(meetingDay, meetingTime);
    if (!candidate) {
        return {
            error: "invalid_schedule",
            status: 422,
            message: "Select at least one valid day and provide a complete start and end time.",
        };
    }
    const existingClasses = await Class_model_1.Class.findAll({
        where: {
            teacherId,
            ...(excludeClassId ? { id: { [sequelize_1.Op.ne]: excludeClassId } } : {}),
            [sequelize_1.Op.or]: [{ academicYear }, { academicYear: null }],
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    for (const existing of existingClasses) {
        const existingSchedule = (0, schedule_conflict_1.parseClassSchedule)(existing.meetingDay, existing.meetingTime);
        if (!existingSchedule)
            continue;
        const days = (0, schedule_conflict_1.overlappingDays)(candidate, existingSchedule);
        if (!days.length)
            continue;
        const [subject, section] = await Promise.all([
            existing.subjectId
                ? Subject_model_1.Subject.findByPk(existing.subjectId, { transaction })
                : Promise.resolve(null),
            existing.sectionId
                ? Section_model_1.Section.findByPk(existing.sectionId, { transaction })
                : Promise.resolve(null),
        ]);
        const dayLabels = days.map(schedule_conflict_1.weekdayLabel);
        const classLabel = [
            subject?.name || existing.name || "Existing class",
            [existing.gradeLevel, section?.name].filter(Boolean).join(" – "),
        ]
            .filter(Boolean)
            .join(" • ");
        return {
            error: "schedule_conflict",
            status: 409,
            message: `Schedule conflict on ${dayLabels.join(", ")}: ${candidate.timeLabel} overlaps with ${classLabel} (${existingSchedule.timeLabel}) in Academic Year ${academicYear}.`,
            conflict: {
                classId: Number(existing.id),
                className: existing.name,
                subjectName: subject?.name ?? null,
                gradeLevel: existing.gradeLevel,
                sectionName: section?.name ?? null,
                days: dayLabels,
                meetingTime: existingSchedule.timeLabel,
                academicYear,
            },
        };
    }
    return null;
}
function toSubjectKey(subject) {
    const key = normalizeText(subject);
    return SUBJECT_ALIAS_TO_KEY[key] ?? null;
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
async function getClassFormOptionsForTeacher(userId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const [sections, students, classes] = await Promise.all([
        Section_model_1.Section.findAll({ order: [["name", "ASC"]] }),
        Student_model_1.Student.findAll({ attributes: ["yearLevel"] }),
        Class_model_1.Class.findAll({ where: { teacherId: teacher.id }, attributes: ["gradeLevel"] }),
    ]);
    const gradeLevels = new Map();
    for (const row of [...students, ...classes]) {
        const value = String(row.get("yearLevel") ?? row.get("gradeLevel") ?? "").trim();
        if (!value)
            continue;
        const key = value.toLowerCase().replace(/\s+/g, " ").trim();
        if (!gradeLevels.has(key))
            gradeLevels.set(key, value);
    }
    return {
        gradeLevels: Array.from(gradeLevels.values()),
        sections: sections.map((section) => ({
            id: Number(section.id),
            name: section.name,
        })),
    };
}
async function createClassForTeacher(userId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const meetingDayValue = serializeMeetingDays(input.meetingDay);
    const meetingDay = meetingDayValue ? meetingDayValue.slice(0, 20) : null;
    const meetingTime = input.meetingTime?.toString().slice(0, 100) ?? null;
    const academic = await (0, settings_service_1.getAcademicContext)();
    return db_1.sequelize.transaction({
        isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    }, async (transaction) => {
        const validation = await scheduleValidation(Number(teacher.id), academic.currentSchoolYear, meetingDay, meetingTime, transaction);
        if (validation)
            return validation;
        let subjectId = input.subjectId ?? null;
        if (!subjectId && input.subjectName?.trim()) {
            const normalizedSubject = input.subjectName.trim();
            const existingSubject = await Subject_model_1.Subject.findOne({
                where: { name: normalizedSubject },
                transaction,
            });
            const subject = existingSubject ??
                (await Subject_model_1.Subject.create({ name: normalizedSubject, code: null }, { transaction }));
            subjectId = subject.id;
        }
        let sectionId = input.sectionId ?? null;
        if (!sectionId && input.className?.trim()) {
            const sectionName = input.className.trim();
            const [section] = await Section_model_1.Section.findOrCreate({
                where: { name: sectionName },
                defaults: { name: sectionName },
                transaction,
            });
            sectionId = Number(section.id);
        }
        const resolvedClassName = (input.className ?? input.subjectName ?? null)
            ?.toString()
            .slice(0, 120) ?? null;
        return Class_model_1.Class.create({
            teacherId: teacher.id,
            name: resolvedClassName,
            subjectId: subjectId ?? null,
            sectionId,
            gradeLevel: input.gradeLevel ?? null,
            buildingName: input.buildingName?.trim() || null,
            meetingDay,
            meetingTime,
            academicYear: academic.currentSchoolYear || null,
        }, { transaction });
    });
}
async function updateClassForTeacher(userId, classId, input) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const cls = await Class_model_1.Class.findByPk(classId);
    if (!cls || cls.teacherId !== teacher.id)
        return false;
    const meetingDaySource = input.meetingDay !== undefined ? input.meetingDay : cls.meetingDay;
    const meetingDayValue = serializeMeetingDays(meetingDaySource);
    const meetingDay = meetingDayValue ? meetingDayValue.slice(0, 20) : null;
    const meetingTime = (input.meetingTime ?? cls.meetingTime)
        ?.toString()
        .slice(0, 100) ?? null;
    const academic = await (0, settings_service_1.getAcademicContext)();
    const academicYear = cls.academicYear || academic.currentSchoolYear;
    return db_1.sequelize.transaction({
        isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    }, async (transaction) => {
        const validation = await scheduleValidation(Number(teacher.id), academicYear, meetingDay, meetingTime, transaction, Number(cls.id));
        if (validation)
            return validation;
        let subjectId = input.subjectId ?? cls.subjectId ?? null;
        if (!input.subjectId && input.subjectName?.trim()) {
            const normalizedSubject = input.subjectName.trim();
            const existingSubject = await Subject_model_1.Subject.findOne({
                where: { name: normalizedSubject },
                transaction,
            });
            const subject = existingSubject ??
                (await Subject_model_1.Subject.create({ name: normalizedSubject, code: null }, { transaction }));
            subjectId = subject.id;
        }
        let sectionId = input.sectionId ?? cls.sectionId ?? null;
        if (!input.sectionId && input.className?.trim()) {
            const sectionName = input.className.trim();
            const [section] = await Section_model_1.Section.findOrCreate({
                where: { name: sectionName },
                defaults: { name: sectionName },
                transaction,
            });
            sectionId = Number(section.id);
        }
        const resolvedClassName = (input.className ?? input.subjectName ?? cls.name)
            ?.toString()
            .slice(0, 120) ?? null;
        await cls.update({
            subjectId,
            sectionId,
            gradeLevel: input.gradeLevel ?? cls.gradeLevel,
            buildingName: input.buildingName !== undefined
                ? input.buildingName?.trim() || null
                : cls.buildingName,
            name: resolvedClassName,
            meetingDay,
            meetingTime,
            academicYear,
        }, { transaction });
        return cls;
    });
}
async function deleteClassForTeacher(userId, classId, password) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const user = await User_model_1.User.findByPk(userId);
    const normalizedPassword = String(password ?? "").trim();
    if (!user || !user.passwordHash || !normalizedPassword) {
        return "invalid_password";
    }
    const validPassword = await bcryptjs_1.default.compare(normalizedPassword, user.passwordHash);
    if (!validPassword) {
        return "invalid_password";
    }
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
    const academic = await (0, settings_service_1.getAcademicContext)();
    if (!academic.currentSchoolYear ||
        academic.gradeEncodingStatus === "UNAVAILABLE") {
        return {
            error: "Academic grading settings are not configured.",
            status: 409,
        };
    }
    const selectedTerm = (0, academic_terms_1.normalizeAcademicTerm)(input.term);
    if (selectedTerm !== academic.gradeEncodingTerm) {
        return {
            error: academic.gradeEncodingTerm
                ? `Grades can only be encoded for ${academic.gradeEncodingTerm}.`
                : "Grade encoding is not open for an academic term.",
            status: 403,
        };
    }
    if (academic.gradeEncodingStatus !== "OPEN") {
        return {
            error: "Grade encoding is currently locked.",
            status: 423,
        };
    }
    const subjectName = normalizeSubjectName(input.subject);
    const subjectKey = toSubjectKey(input.subject);
    if (!subjectKey)
        return false;
    const classes = await Class_model_1.Class.findAll({ where: { teacherId: teacher.id }, order: [["id", "ASC"]] });
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
    const draftName = `${selectedTerm}|${subjectName}|draft`;
    const publishName = `${selectedTerm}|${subjectName}|published`;
    const existingItems = await GradeItem_model_1.GradeItem.findAll({
        where: {
            classId,
            academicYear: academic.currentSchoolYear,
        },
    });
    const existing = existingItems.find((item) => {
        const parsed = parseGradeItemName(item.name);
        return (!!parsed &&
            (0, academic_terms_1.normalizeAcademicTerm)(parsed.term) === selectedTerm &&
            parsed.subjectKey === subjectKey);
    });
    const gradeItem = existing ??
        (await GradeItem_model_1.GradeItem.create({
            classId,
            name: draftName,
            weight: 1,
            maxScore: 100,
            dueDate: null,
            academicYear: academic.currentSchoolYear,
            gradeLevel: targetClass.gradeLevel,
        }));
    if (!gradeItem.gradeLevel && targetClass.gradeLevel) {
        await gradeItem.update({ gradeLevel: targetClass.gradeLevel });
    }
    const existingState = parseGradeItemName(gradeItem.name);
    if (existingState?.published) {
        return {
            error: "Published grades are locked. Only the Super Admin can unlock them.",
            status: 423,
        };
    }
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
async function getAcademicSessionsForStudent(userId) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    const academic = await (0, settings_service_1.getAcademicContext)();
    const grades = await Grade_model_1.Grade.findAll({
        where: { studentId: Number(student.id) },
        attributes: ["gradeItemId"],
    });
    const gradeItemIds = grades.map((grade) => Number(grade.gradeItemId));
    const items = gradeItemIds.length
        ? await GradeItem_model_1.GradeItem.findAll({
            where: {
                id: gradeItemIds,
                academicYear: { [sequelize_1.Op.ne]: null },
                name: { [sequelize_1.Op.like]: "%|published" },
            },
            attributes: ["classId", "academicYear", "gradeLevel"],
        })
        : [];
    const classIds = [...new Set(items.map((item) => Number(item.classId)))];
    const classes = classIds.length
        ? await Class_model_1.Class.findAll({
            where: { id: classIds },
            attributes: ["id", "gradeLevel"],
        })
        : [];
    const gradeByClass = new Map(classes.map((item) => [Number(item.id), item.gradeLevel]));
    const sessions = new Map();
    for (const item of items) {
        const academicYear = String(item.academicYear ?? "").trim();
        const gradeLevel = String(item.gradeLevel ?? gradeByClass.get(Number(item.classId)) ?? "").trim();
        if (!academicYear || !gradeLevel)
            continue;
        const current = !student.graduatedAt &&
            academicYear === academic.currentSchoolYear &&
            gradeLevel === String(student.yearLevel ?? "");
        sessions.set(`${academicYear}|${gradeLevel}`, {
            academicYear,
            gradeLevel,
            status: current ? "Current" : "Completed",
        });
    }
    if (!student.graduatedAt && academic.currentSchoolYear && student.yearLevel) {
        const key = `${academic.currentSchoolYear}|${student.yearLevel}`;
        sessions.set(key, {
            academicYear: academic.currentSchoolYear,
            gradeLevel: student.yearLevel,
            status: "Current",
        });
    }
    return Array.from(sessions.values()).sort((left, right) => {
        if (left.status !== right.status)
            return left.status === "Current" ? -1 : 1;
        const leftYear = Number(left.academicYear.match(/\d{4}/)?.[0] ?? 0);
        const rightYear = Number(right.academicYear.match(/\d{4}/)?.[0] ?? 0);
        if (leftYear !== rightYear)
            return rightYear - leftYear;
        const leftGrade = Number(left.gradeLevel.match(/\d+/)?.[0] ?? 0);
        const rightGrade = Number(right.gradeLevel.match(/\d+/)?.[0] ?? 0);
        return rightGrade - leftGrade;
    });
}
async function getAcademicSessionsForTeacher(userId) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const academic = await (0, settings_service_1.getAcademicContext)();
    const classes = await Class_model_1.Class.findAll({
        where: { teacherId: teacher.id },
        attributes: ["id", "gradeLevel"],
    });
    const classById = new Map(classes.map((item) => [Number(item.id), item.gradeLevel]));
    const classIds = Array.from(classById.keys());
    const items = classIds.length
        ? await GradeItem_model_1.GradeItem.findAll({
            where: {
                classId: classIds,
                academicYear: { [sequelize_1.Op.ne]: null },
            },
            attributes: ["classId", "academicYear", "gradeLevel"],
        })
        : [];
    const sessions = new Map();
    for (const item of items) {
        const academicYear = String(item.academicYear ?? "").trim();
        const gradeLevel = String(item.gradeLevel ?? classById.get(Number(item.classId)) ?? "").trim();
        if (!academicYear || !gradeLevel)
            continue;
        const status = academicYear === academic.currentSchoolYear ? "Current" : "Completed";
        sessions.set(`${academicYear}|${gradeLevel}`, {
            academicYear,
            gradeLevel,
            status,
        });
    }
    if (academic.currentSchoolYear) {
        for (const gradeLevel of new Set(classes.map((item) => item.gradeLevel).filter(Boolean))) {
            sessions.set(`${academic.currentSchoolYear}|${gradeLevel}`, {
                academicYear: academic.currentSchoolYear,
                gradeLevel,
                status: "Current",
            });
        }
    }
    return Array.from(sessions.values()).sort((left, right) => {
        if (left.status !== right.status)
            return left.status === "Current" ? -1 : 1;
        const leftYear = Number(left.academicYear.match(/\d{4}/)?.[0] ?? 0);
        const rightYear = Number(right.academicYear.match(/\d{4}/)?.[0] ?? 0);
        return rightYear - leftYear;
    });
}
async function getPublishedGradesForStudent(userId, filter) {
    const student = await Student_model_1.Student.findOne({ where: { userId } });
    if (!student)
        return null;
    const rows = academic_terms_1.ACADEMIC_TERMS.map((term, index) => ({
        id: index + 1,
        name: term,
        math: 0,
        science: 0,
        english: 0,
        filipino: 0,
        mapeh: 0,
        ap: 0,
        tle: 0,
        values: 0,
    }));
    const targetTerm = filter?.term
        ? (0, academic_terms_1.normalizeAcademicTerm)(filter.term)
        : "";
    const academic = await (0, settings_service_1.getAcademicContext)();
    const selectedAcademicYear = filter?.academicYear?.trim() || academic.currentSchoolYear;
    const selectedGradeLevel = filter?.gradeLevel?.trim() || student.yearLevel || "";
    const emptyResult = {
        rows,
        academicYear: selectedAcademicYear || null,
        gradeLevel: selectedGradeLevel || null,
        status: !student.graduatedAt &&
            selectedAcademicYear === academic.currentSchoolYear &&
            selectedGradeLevel === String(student.yearLevel ?? "")
            ? "Current"
            : "Completed",
        finalSubjectAverages: {},
        overallAverage: null,
        academicRemarks: null,
    };
    if (!selectedAcademicYear || !selectedGradeLevel)
        return emptyResult;
    const studentGrades = await Grade_model_1.Grade.findAll({
        where: { studentId: Number(student.id) },
    });
    const studentItemIds = studentGrades.map((grade) => Number(grade.gradeItemId));
    if (!studentItemIds.length)
        return emptyResult;
    const candidateItems = await GradeItem_model_1.GradeItem.findAll({
        where: {
            id: studentItemIds,
            academicYear: selectedAcademicYear,
            name: { [sequelize_1.Op.like]: "%|published" },
        },
    });
    const candidateClassIds = [
        ...new Set(candidateItems.map((item) => Number(item.classId))),
    ];
    const sessionClasses = candidateClassIds.length
        ? await Class_model_1.Class.findAll({
            where: { id: candidateClassIds, gradeLevel: selectedGradeLevel },
            attributes: ["id"],
        })
        : [];
    const classIds = new Set(sessionClasses.map((item) => Number(item.id)));
    const gradeItems = candidateItems.filter((item) => item.gradeLevel
        ? item.gradeLevel === selectedGradeLevel
        : classIds.has(Number(item.classId)));
    const itemIds = gradeItems.map((g) => Number(g.id));
    if (!itemIds.length)
        return emptyResult;
    const grades = studentGrades.filter((grade) => itemIds.includes(Number(grade.gradeItemId)));
    const scoreByItemId = new Map(grades.map((g) => [Number(g.gradeItemId), Number(g.score)]));
    const scoresBySubject = new Map();
    for (const item of gradeItems) {
        const parsed = parseGradeItemName(item.name);
        if (!parsed || !parsed.published)
            continue;
        const term = (0, academic_terms_1.normalizeAcademicTerm)(parsed.term);
        if (!term)
            continue;
        if (targetTerm && term !== targetTerm)
            continue;
        const row = rows.find((r) => r.name === term);
        if (!row)
            continue;
        const mapped = parsed.subjectKey;
        const score = scoreByItemId.get(Number(item.id));
        if (score === undefined)
            continue;
        row[mapped] = score;
        const subjectScores = scoresBySubject.get(parsed.subjectKey) ?? new Map();
        subjectScores.set(term, score);
        scoresBySubject.set(parsed.subjectKey, subjectScores);
    }
    const finalSubjectAverages = {};
    const finalCandidates = [];
    for (const [subject, scores] of scoresBySubject) {
        const values = [
            scores.get("Term 1"),
            scores.get("Term 2"),
            scores.get("Term 3"),
        ];
        const average = (0, calculations_1.calculateFinalSubjectAverage)(values);
        finalCandidates.push(average);
        if (average !== null)
            finalSubjectAverages[subject] = average;
    }
    return {
        ...emptyResult,
        finalSubjectAverages,
        overallAverage: (0, calculations_1.calculateOverallStudentAverage)(finalCandidates),
    };
}
async function getPublishedGradesForTeacher(userId, filter) {
    const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId } });
    if (!teacher)
        return null;
    const academic = await (0, settings_service_1.getAcademicContext)();
    const teacherClasses = await Class_model_1.Class.findAll({ where: { teacherId: teacher.id }, order: [["id", "ASC"]] });
    const section = normalizeText(filter.section);
    const gradeLevel = normalizeText(filter.gradeLevel);
    const selectedAcademicYear = filter.academicYear?.trim() || academic.currentSchoolYear;
    const historical = Boolean(selectedAcademicYear &&
        selectedAcademicYear !== academic.currentSchoolYear);
    const selectedSubjectKey = filter.subject ? toSubjectKey(filter.subject) : null;
    const teacherScopeClasses = teacherClasses.filter((cls) => {
        const sectionOk = !section || section === "all sections" || normalizeText(cls.name) === section;
        return sectionOk;
    });
    if (!teacherScopeClasses.length)
        return {
            rows: [],
            published: false,
            academic,
            academicYear: selectedAcademicYear || null,
            sessionStatus: historical ? "Completed" : "Current",
        };
    const term = normalizeText(filter.term);
    const items = await GradeItem_model_1.GradeItem.findAll({
        where: {
            classId: teacherScopeClasses.map((item) => Number(item.id)),
            ...(selectedAcademicYear
                ? { academicYear: selectedAcademicYear }
                : {}),
        },
        order: [["id", "DESC"]],
    });
    const selectedItem = items.find((item) => {
        const parsed = parseGradeItemName(item.name);
        if (!parsed)
            return false;
        if (historical && !parsed.published)
            return false;
        const itemClass = teacherScopeClasses.find((cls) => Number(cls.id) === Number(item.classId));
        const itemGrade = normalizeText(item.gradeLevel ?? itemClass?.gradeLevel);
        const gradeOk = !gradeLevel || gradeLevel === "all grades" || itemGrade === gradeLevel;
        const termOk = !term ||
            normalizeText((0, academic_terms_1.normalizeAcademicTerm)(parsed.term)) ===
                normalizeText((0, academic_terms_1.normalizeAcademicTerm)(term));
        const subjectOk = !selectedSubjectKey || parsed.subjectKey === selectedSubjectKey;
        return gradeOk && termOk && subjectOk;
    });
    if (!selectedItem)
        return {
            rows: [],
            published: false,
            academic,
            academicYear: selectedAcademicYear || null,
            sessionStatus: historical ? "Completed" : "Current",
        };
    const parsed = parseGradeItemName(selectedItem.name);
    const grades = await Grade_model_1.Grade.findAll({ where: { gradeItemId: Number(selectedItem.id) } });
    const students = grades.length
        ? await Student_model_1.Student.findAll({
            where: { id: grades.map((grade) => Number(grade.studentId)) },
            attributes: ["id", "firstName", "lastName"],
        })
        : [];
    const studentById = new Map(students.map((student) => [
        Number(student.id),
        `${student.lastName}, ${student.firstName}`,
    ]));
    return {
        rows: grades.map((g) => ({
            studentId: Number(g.studentId),
            studentName: studentById.get(Number(g.studentId)) ?? "Student",
            score: Number(g.score),
        })),
        published: !!parsed?.published,
        academic,
        academicYear: selectedAcademicYear || null,
        sessionStatus: historical ? "Completed" : "Current",
    };
}
