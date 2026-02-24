"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyAssignments = listMyAssignments;
exports.createMyAssignment = createMyAssignment;
exports.submitMyAssignment = submitMyAssignment;
exports.listMyAssignmentResults = listMyAssignmentResults;
const assignments_service_1 = require("./assignments.service");
async function listMyAssignments(req, res) {
    const user = req.user;
    const userId = user?.sub;
    const role = user?.role;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const rows = role === "student" ? await (0, assignments_service_1.listAssignmentsForStudent)(userId) : await (0, assignments_service_1.listAssignmentsForTeacher)(userId);
    if (rows === null) {
        return res
            .status(404)
            .json({ ok: false, message: role === "student" ? "Student profile not found" : "Teacher profile not found" });
    }
    return res.json({ ok: true, assignments: rows });
}
async function createMyAssignment(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const assignment = await (0, assignments_service_1.createAssignmentForTeacher)(userId, req.body ?? {});
    if (assignment === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (assignment === false)
        return res.status(400).json({ ok: false, message: "Invalid class or payload" });
    return res.status(201).json({ ok: true, assignment });
}
async function submitMyAssignment(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, assignments_service_1.submitAssignmentForStudent)(userId, req.params.id);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Student profile not found" });
    if (result === false)
        return res.status(400).json({ ok: false, message: "Assignment not found for this student" });
    return res.json({ ok: true, submission: result });
}
async function listMyAssignmentResults(req, res) {
    const userId = req.user?.sub;
    if (!userId)
        return res.status(401).json({ ok: false, message: "Unauthorized" });
    const result = await (0, assignments_service_1.listAssignmentResultsForTeacher)(userId, req.params.id);
    if (result === null)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    if (result === false)
        return res.status(404).json({ ok: false, message: "Assignment not found" });
    return res.json({ ok: true, ...result });
}
