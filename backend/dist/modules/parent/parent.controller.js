"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.list = list;
exports.getById = getById;
exports.me = me;
exports.update = update;
exports.remove = remove;
const parent_service_1 = require("./parent.service");
async function create(req, res) {
    const result = await (0, parent_service_1.createParent)(req.body);
    if (!result.ok)
        return res.status(result.code).json({ ok: false, message: result.message });
    return res.status(201).json(result);
}
async function list(req, res) {
    const parents = await (0, parent_service_1.listParents)();
    return res.json({ ok: true, parents });
}
async function getById(req, res) {
    const parent = await (0, parent_service_1.getParentById)(req.params.id);
    if (!parent)
        return res.status(404).json({ ok: false, message: "Parent not found" });
    return res.json({ ok: true, parent });
}
async function me(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const parent = await (0, parent_service_1.getParentByUserId)(userId);
    if (!parent)
        return res.status(404).json({ ok: false, message: "Parent profile not found" });
    return res.json({ ok: true, parent });
}
async function update(req, res) {
    const parent = await (0, parent_service_1.updateParent)(req.params.id, req.body ?? {});
    if (!parent)
        return res.status(404).json({ ok: false, message: "Parent not found" });
    return res.json({ ok: true, parent });
}
async function remove(req, res) {
    const ok = await (0, parent_service_1.deleteParent)(req.params.id);
    if (!ok)
        return res.status(404).json({ ok: false, message: "Parent not found" });
    return res.json({ ok: true });
}
