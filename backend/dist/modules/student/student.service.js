"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStudent = createStudent;
exports.listStudents = listStudents;
exports.getStudentById = getStudentById;
exports.getStudentByUserId = getStudentByUserId;
exports.updateStudent = updateStudent;
exports.deleteStudent = deleteStudent;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../../config/db");
const Student_model_1 = require("../../db/models/Student.model");
const User_model_1 = require("../../db/models/User.model");
async function createStudent(input) {
    return db_1.sequelize.transaction(async (t) => {
        const existing = await User_model_1.User.findOne({ where: { email: input.email }, transaction: t });
        if (existing) {
            return { ok: false, code: 409, message: "Email already in use" };
        }
        const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
        const user = await User_model_1.User.create({
            email: input.email,
            passwordHash,
            role: "student",
            refreshTokenHash: null,
        }, { transaction: t });
        const student = await Student_model_1.Student.create({
            userId: user.id,
            lrn: input.lrn,
            firstName: input.firstName,
            lastName: input.lastName,
            middleName: input.middleName ?? null,
            birthDate: input.birthDate ?? null,
            gender: input.gender ?? null,
            guardianContact: input.guardianContact ?? null,
        }, { transaction: t });
        return {
            ok: true,
            student,
            user: { id: user.id, email: user.email, role: user.role },
        };
    });
}
async function listStudents() {
    return Student_model_1.Student.findAll({ order: [["createdAt", "DESC"]] });
}
async function getStudentById(id) {
    return Student_model_1.Student.findByPk(id);
}
async function getStudentByUserId(userId) {
    return Student_model_1.Student.findOne({ where: { userId } });
}
async function updateStudent(id, data) {
    const student = await Student_model_1.Student.findByPk(id);
    if (!student)
        return null;
    await student.update({
        firstName: data.firstName ?? student.firstName,
        lastName: data.lastName ?? student.lastName,
        middleName: data.middleName ?? student.middleName,
        birthDate: data.birthDate ?? student.birthDate,
        gender: data.gender ?? student.gender,
        guardianContact: data.guardianContact ?? student.guardianContact,
    });
    return student;
}
async function deleteStudent(id) {
    const student = await Student_model_1.Student.findByPk(id);
    if (!student)
        return false;
    await student.destroy();
    return true;
}
