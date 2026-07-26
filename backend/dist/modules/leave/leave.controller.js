"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myLeaves = myLeaves;
exports.allLeaves = allLeaves;
exports.submitLeave = submitLeave;
exports.editLeave = editLeave;
exports.cancelLeave = cancelLeave;
exports.approveLeave = approveLeave;
exports.rejectLeave = rejectLeave;
exports.activateTakeover = activateTakeover;
exports.emergencyTakeover = emergencyTakeover;
exports.endTakeover = endTakeover;
exports.cancelTakeover = cancelTakeover;
exports.activities = activities;
exports.audits = audits;
exports.notifications = notifications;
exports.readNotification = readNotification;
exports.readAllNotifications = readAllNotifications;
exports.clearAllNotifications = clearAllNotifications;
exports.takeoverWorkspace = takeoverWorkspace;
exports.takeoverAttendance = takeoverAttendance;
exports.takeoverAssignment = takeoverAssignment;
exports.takeoverGrades = takeoverGrades;
exports.updateTakeoverGrades = updateTakeoverGrades;
const leave_service_1 = require("./leave.service");
const leave_upload_1 = require("./leave.upload");
function context(req) {
    return {
        user: req.user,
        ip: req.ip,
        device: req.get("user-agent"),
    };
}
function resultResponse(res, result, successStatus = 200) {
    if (result.error)
        return res.status(result.status ?? 400).json({ ok: false, message: result.error });
    return res.status(successStatus).json({ ok: true, leave: result.leave });
}
async function myLeaves(req, res) {
    const requests = await (0, leave_service_1.listTeacherLeaves)(String(req.user.sub));
    if (!requests)
        return res.status(404).json({ ok: false, message: "Teacher profile not found" });
    return res.json({ ok: true, requests });
}
async function allLeaves(req, res) {
    return res.json({ ok: true, requests: await (0, leave_service_1.listAdminLeaves)(req.query) });
}
async function submitLeave(req, res) {
    return resultResponse(res, await (0, leave_service_1.createLeave)(context(req), req.body ?? {}, req.file ? (0, leave_upload_1.leaveAttachmentUrl)(req.file.filename) : undefined), 201);
}
async function editLeave(req, res) {
    return resultResponse(res, await (0, leave_service_1.updatePendingLeave)(context(req), req.params.id, req.body ?? {}, req.file ? (0, leave_upload_1.leaveAttachmentUrl)(req.file.filename) : undefined));
}
async function cancelLeave(req, res) {
    return resultResponse(res, await (0, leave_service_1.cancelPendingLeave)(context(req), req.params.id));
}
async function approveLeave(req, res) {
    return resultResponse(res, await (0, leave_service_1.reviewLeave)(context(req), req.params.id, "approve", req.body ?? {}));
}
async function rejectLeave(req, res) {
    return resultResponse(res, await (0, leave_service_1.reviewLeave)(context(req), req.params.id, "reject", req.body ?? {}));
}
async function activateTakeover(req, res) {
    return resultResponse(res, await (0, leave_service_1.startTakeover)(context(req), req.params.id));
}
async function emergencyTakeover(req, res) {
    return resultResponse(res, await (0, leave_service_1.createEmergencyTakeover)(context(req), req.body ?? {}), 201);
}
async function endTakeover(req, res) {
    return resultResponse(res, await (0, leave_service_1.finishTakeover)(context(req), req.params.id, "complete"));
}
async function cancelTakeover(req, res) {
    return resultResponse(res, await (0, leave_service_1.finishTakeover)(context(req), req.params.id, "cancel"));
}
async function activities(req, res) {
    const rows = await (0, leave_service_1.takeoverActivities)(String(req.user.sub), String(req.user.role), req.params.id);
    if (rows === null)
        return res.status(404).json({ ok: false, message: "Leave request not found" });
    return res.json({ ok: true, activities: rows });
}
async function audits(req, res) {
    return res.json({
        ok: true,
        audits: await (0, leave_service_1.leaveAuditLogs)(req.params.id),
    });
}
async function notifications(req, res) {
    return res.json({ ok: true, notifications: await (0, leave_service_1.listNotifications)(String(req.user.sub)) });
}
async function readNotification(req, res) {
    await (0, leave_service_1.markNotificationRead)(String(req.user.sub), req.params.id);
    return res.json({ ok: true });
}
async function readAllNotifications(req, res) {
    await (0, leave_service_1.markNotificationRead)(String(req.user.sub));
    return res.json({ ok: true });
}
async function clearAllNotifications(req, res) {
    await (0, leave_service_1.clearNotifications)(String(req.user.sub));
    return res.json({ ok: true });
}
async function takeoverWorkspace(req, res) {
    const workspace = await (0, leave_service_1.getTakeoverWorkspace)(req.params.id, typeof req.query.date === "string" ? req.query.date : undefined);
    if (!workspace)
        return res
            .status(404)
            .json({ ok: false, message: "Active takeover not found" });
    await (0, leave_service_1.recordTakeoverWorkspaceAccess)(context(req), req.params.id, typeof req.query.tool === "string" ? req.query.tool : undefined);
    return res.json({ ok: true, workspace });
}
async function takeoverAttendance(req, res) {
    const result = await (0, leave_service_1.saveTakeoverAttendance)(context(req), req.params.id, req.body ?? {});
    if ("error" in result)
        return res.status(result.status ?? 400).json({ ok: false, message: result.error });
    return res.json({ ok: true, saved: result.saved });
}
async function takeoverAssignment(req, res) {
    const result = await (0, leave_service_1.createTakeoverAssignment)(context(req), req.params.id, req.body ?? {});
    if ("error" in result)
        return res.status(result.status ?? 400).json({ ok: false, message: result.error });
    return res.status(201).json({ ok: true, assignment: result.assignment });
}
async function takeoverGrades(req, res) {
    const grades = await (0, leave_service_1.getTakeoverGrades)(req.params.id, {
        section: typeof req.query.section === "string" ? req.query.section : undefined,
        gradeLevel: typeof req.query.gradeLevel === "string"
            ? req.query.gradeLevel
            : undefined,
        subject: typeof req.query.subject === "string" ? req.query.subject : undefined,
        term: typeof req.query.term === "string" ? req.query.term : undefined,
    });
    if (!grades)
        return res
            .status(404)
            .json({ ok: false, message: "Active takeover not found" });
    return res.json({ ok: true, ...grades });
}
async function updateTakeoverGrades(req, res) {
    const result = await (0, leave_service_1.saveTakeoverGrades)(context(req), req.params.id, req.body);
    if ("error" in result)
        return res.status(result.status ?? 400).json({ ok: false, message: result.error });
    return res.json({ ok: true, saved: result.saved });
}
