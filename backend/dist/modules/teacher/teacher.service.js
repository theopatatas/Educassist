"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTeacher = createTeacher;
exports.listTeachers = listTeachers;
exports.getTeacherById = getTeacherById;
exports.getTeacherByUserId = getTeacherByUserId;
exports.updateTeacher = updateTeacher;
exports.deleteTeacher = deleteTeacher;
exports.listTeacherSubjects = listTeacherSubjects;
exports.addSubjectForTeacher = addSubjectForTeacher;
exports.addTeachingLoadForTeacher = addTeachingLoadForTeacher;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../../config/db");
const Class_model_1 = require("../../db/models/Class.model");
const Section_model_1 = require("../../db/models/Section.model");
const Subject_model_1 = require("../../db/models/Subject.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
const User_model_1 = require("../../db/models/User.model");
async function createTeacher(input) {
    return db_1.sequelize.transaction(async (t) => {
        const existing = await User_model_1.User.findOne({ where: { email: input.email }, transaction: t });
        if (existing) {
            return { ok: false, code: 409, message: "Email already in use" };
        }
        const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
        const user = await User_model_1.User.create({
            email: input.email,
            passwordHash,
            role: "TEACHER",
            refreshTokenHash: null,
        }, { transaction: t });
        const teacher = await Teacher_model_1.Teacher.create({
            userId: user.id,
            firstName: input.firstName,
            lastName: input.lastName,
            employeeNumber: input.employeeNumber,
            gradeLevel: input.gradeLevel ?? null,
            sectionId: input.sectionId ? Number(input.sectionId) : null,
        }, { transaction: t });
        return {
            ok: true,
            teacher,
            user: { id: user.id, email: user.email, role: user.role },
        };
    });
}
async function listTeachers() {
    return Teacher_model_1.Teacher.findAll({ order: [["createdAt", "DESC"]] });
}
async function getTeacherById(id) {
    return Teacher_model_1.Teacher.findByPk(id);
}
async function getTeacherByUserId(userId) {
    return Teacher_model_1.Teacher.findOne({ where: { userId } });
}
async function updateTeacher(id, data) {
    const teacher = await Teacher_model_1.Teacher.findByPk(id);
    if (!teacher)
        return null;
    await teacher.update({
        firstName: data.firstName ?? teacher.firstName,
        lastName: data.lastName ?? teacher.lastName,
        employeeNumber: data.employeeNumber ?? teacher.employeeNumber,
    });
    return teacher;
}
async function deleteTeacher(id) {
    const teacher = await Teacher_model_1.Teacher.findByPk(id);
    if (!teacher)
        return false;
    await teacher.destroy();
    return true;
}
async function listTeacherSubjects(teacherId) {
    const classes = await Class_model_1.Class.findAll({ where: { teacherId } });
    const subjectIds = classes.map((c) => c.subjectId).filter(Boolean);
    if (subjectIds.length === 0)
        return [];
    return Subject_model_1.Subject.findAll({ where: { id: subjectIds } });
}
async function addSubjectForTeacher(teacherId, input) {
    return db_1.sequelize.transaction(async (t) => {
        const teacher = await Teacher_model_1.Teacher.findByPk(teacherId, { transaction: t });
        if (!teacher)
            return { ok: false, code: 404, message: "Teacher not found" };
        const normalizedName = input.name.trim();
        const existingSubject = await Subject_model_1.Subject.findOne({ where: { name: normalizedName }, transaction: t });
        const subject = existingSubject ?? (await Subject_model_1.Subject.create({ name: normalizedName, code: null }, { transaction: t }));
        await Class_model_1.Class.create({
            teacherId: teacher.id,
            subjectId: subject.id,
            sectionId: null,
            name: subject.name,
        }, { transaction: t });
        return { ok: true, subject };
    });
}
async function addTeachingLoadForTeacher(userId, entries) {
    return db_1.sequelize.transaction(async (t) => {
        const teacher = await Teacher_model_1.Teacher.findOne({ where: { userId }, transaction: t });
        if (!teacher)
            return { ok: false, code: 404, message: "Teacher not found" };
        for (const entry of entries) {
            if (!entry.subject || !entry.gradeLevel || !entry.section) {
                return { ok: false, code: 400, message: "All fields are required" };
            }
            const normalizedSubject = entry.subject.trim();
            const existingSubject = await Subject_model_1.Subject.findOne({
                where: { name: normalizedSubject },
                transaction: t,
            });
            const subject = existingSubject ??
                (await Subject_model_1.Subject.create({ name: normalizedSubject, code: null }, { transaction: t }));
            const existingSection = await Section_model_1.Section.findOne({
                where: { name: entry.section },
                transaction: t,
            });
            const section = existingSection ?? (await Section_model_1.Section.create({ name: entry.section }, { transaction: t }));
            await Class_model_1.Class.create({
                teacherId: teacher.id,
                subjectId: subject.id,
                sectionId: section.id,
                gradeLevel: entry.gradeLevel,
                name: subject.name,
            }, { transaction: t });
        }
        return { ok: true };
    });
}
