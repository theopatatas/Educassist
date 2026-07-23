"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAdminActivity = recordAdminActivity;
exports.getAdminActivities = getAdminActivities;
exports.listUsers = listUsers;
exports.createAdminUser = createAdminUser;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.setUserProfilePhoto = setUserProfilePhoto;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_model_1 = require("../../db/models/User.model");
const AdminAccountActivity_model_1 = require("../../db/models/AdminAccountActivity.model");
function serializeUser(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        mobileNumber: user.mobileNumber,
        displayName: user.displayName,
        profilePhotoUrl: user.profilePhotoUrl,
        passwordChangedAt: user.passwordChangedAt,
        role: user.role.toLowerCase(),
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.getDataValue("createdAt"),
        updatedAt: user.getDataValue("updatedAt"),
        createdById: user.createdById,
    };
}
async function creatorSummary(createdById) {
    if (!createdById)
        return null;
    const creator = await User_model_1.User.findByPk(createdById);
    if (!creator)
        return null;
    return {
        id: creator.id,
        name: [creator.firstName, creator.middleName, creator.lastName]
            .filter(Boolean)
            .join(" ") || creator.email,
        email: creator.email,
    };
}
async function recordAdminActivity(adminUserId, actorUserId, action, details) {
    await AdminAccountActivity_model_1.AdminAccountActivity.create({
        adminUserId: Number(adminUserId),
        actorUserId: Number(actorUserId),
        action,
        details: details || null,
    });
}
async function getAdminActivities(id) {
    const rows = await AdminAccountActivity_model_1.AdminAccountActivity.findAll({
        where: { adminUserId: id },
        order: [["createdAt", "DESC"]],
        limit: 100,
    });
    const actorIds = [...new Set(rows.map((row) => row.actorUserId))];
    const actors = actorIds.length
        ? await User_model_1.User.findAll({ where: { id: actorIds } })
        : [];
    const actorMap = new Map(actors.map((actor) => [String(actor.id), actor]));
    return rows.map((row) => {
        const actor = actorMap.get(String(row.actorUserId));
        return {
            id: row.id,
            action: row.action,
            details: row.details,
            createdAt: row.createdAt,
            actor: actor
                ? {
                    id: actor.id,
                    name: [actor.firstName, actor.middleName, actor.lastName]
                        .filter(Boolean)
                        .join(" ") || actor.email,
                }
                : null,
        };
    });
}
async function listUsers() {
    const users = await User_model_1.User.findAll({
        order: [["createdAt", "DESC"]],
    });
    return users.map(serializeUser);
}
async function createAdminUser(input) {
    const email = input.email.trim().toLowerCase();
    const existing = await User_model_1.User.findOne({ where: { email } });
    if (existing) {
        return {
            ok: false,
            code: 409,
            message: "Email is already in use",
        };
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const user = await User_model_1.User.create({
        email,
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || null,
        lastName: input.lastName.trim(),
        mobileNumber: input.mobileNumber,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        refreshTokenHash: null,
        createdById: input.createdById,
    });
    await recordAdminActivity(user.id, input.createdById, "Account created");
    return { ok: true, user: serializeUser(user) };
}
async function getUserById(id) {
    const user = await User_model_1.User.findByPk(id);
    if (!user)
        return null;
    return {
        ...serializeUser(user),
        createdBy: await creatorSummary(user.createdById),
    };
}
async function updateUser(id, data) {
    const user = await User_model_1.User.findByPk(id);
    if (!user)
        return null;
    const role = data.role ? data.role.toUpperCase() : user.role;
    await user.update({
        email: data.email ?? user.email,
        role,
        isActive: data.isActive ?? user.isActive,
        firstName: data.firstName ?? user.firstName,
        middleName: data.middleName === undefined ? user.middleName : data.middleName,
        lastName: data.lastName ?? user.lastName,
        mobileNumber: data.mobileNumber ?? user.mobileNumber,
        displayName: data.displayName === undefined ? user.displayName : data.displayName,
    });
    return serializeUser(user);
}
async function deleteUser(id) {
    const user = await User_model_1.User.findByPk(id);
    if (!user)
        return false;
    await user.destroy();
    return true;
}
async function setUserProfilePhoto(id, profilePhotoUrl) {
    const user = await User_model_1.User.findByPk(id);
    if (!user)
        return null;
    const previous = user.profilePhotoUrl;
    await user.update({ profilePhotoUrl });
    return { previous, user: serializeUser(user) };
}
