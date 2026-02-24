"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.update = update;
exports.remove = remove;
const users_service_1 = require("./users.service");
async function list(req, res) {
    const users = await (0, users_service_1.listUsers)();
    return res.json({ ok: true, users });
}
async function getById(req, res) {
    const user = await (0, users_service_1.getUserById)(req.params.id);
    if (!user)
        return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true, user });
}
async function update(req, res) {
    const user = await (0, users_service_1.updateUser)(req.params.id, req.body ?? {});
    if (!user)
        return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true, user });
}
async function remove(req, res) {
    const ok = await (0, users_service_1.deleteUser)(req.params.id);
    if (!ok)
        return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true });
}
