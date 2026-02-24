"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createParent = createParent;
exports.listParents = listParents;
exports.getParentById = getParentById;
exports.getParentByUserId = getParentByUserId;
exports.updateParent = updateParent;
exports.deleteParent = deleteParent;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../../config/db");
const Parent_model_1 = require("../../db/models/Parent.model");
const User_model_1 = require("../../db/models/User.model");
async function createParent(input) {
    return db_1.sequelize.transaction(async (t) => {
        const existing = await User_model_1.User.findOne({ where: { email: input.email }, transaction: t });
        if (existing) {
            return { ok: false, code: 409, message: "Email already in use" };
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
