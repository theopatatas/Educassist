"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
const User_model_1 = require("../../db/models/User.model");
async function listUsers() {
    const users = await User_model_1.User.findAll({
        order: [["createdAt", "DESC"]],
    });
    return users.map((u) => ({ id: u.id, email: u.email, role: u.role.toLowerCase() }));
}
async function getUserById(id) {
    const user = await User_model_1.User.findByPk(id);
    if (!user)
        return null;
    return { id: user.id, email: user.email, role: user.role.toLowerCase() };
}
async function updateUser(id, data) {
    const user = await User_model_1.User.findByPk(id);
    if (!user)
        return null;
    const role = data.role ? data.role.toUpperCase() : user.role;
    await user.update({
        email: data.email ?? user.email,
        role,
    });
    return { id: user.id, email: user.email, role: user.role.toLowerCase() };
}
async function deleteUser(id) {
    const user = await User_model_1.User.findByPk(id);
    if (!user)
        return false;
    await user.destroy();
    return true;
}
