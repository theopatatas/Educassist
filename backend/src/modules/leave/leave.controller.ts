import type { Request, Response } from "express";
import {
  cancelPendingLeave,
  createLeave,
  createEmergencyTakeover,
  createTakeoverAssignment,
  finishTakeover,
  getTakeoverGrades,
  getTakeoverWorkspace,
  listAdminLeaves,
  leaveAuditLogs,
  listNotifications,
  clearNotifications,
  listTeacherLeaves,
  markNotificationRead,
  reviewLeave,
  recordTakeoverWorkspaceAccess,
  startTakeover,
  saveTakeoverAttendance,
  saveTakeoverGrades,
  takeoverActivities,
  updatePendingLeave,
} from "./leave.service";
import { leaveAttachmentUrl } from "./leave.upload";

function context(req: Request) {
  return {
    user: req.user!,
    ip: req.ip,
    device: req.get("user-agent"),
  };
}

function resultResponse(res: Response, result: { error?: string; status?: number; leave?: unknown }, successStatus = 200) {
  if (result.error) return res.status(result.status ?? 400).json({ ok: false, message: result.error });
  return res.status(successStatus).json({ ok: true, leave: result.leave });
}

export async function myLeaves(req: Request, res: Response) {
  const requests = await listTeacherLeaves(String(req.user!.sub));
  if (!requests) return res.status(404).json({ ok: false, message: "Teacher profile not found" });
  return res.json({ ok: true, requests });
}

export async function allLeaves(req: Request, res: Response) {
  return res.json({ ok: true, requests: await listAdminLeaves(req.query) });
}

export async function submitLeave(req: Request, res: Response) {
  return resultResponse(res, await createLeave(context(req), req.body ?? {}, req.file ? leaveAttachmentUrl(req.file.filename) : undefined), 201);
}

export async function editLeave(req: Request, res: Response) {
  return resultResponse(res, await updatePendingLeave(context(req), req.params.id, req.body ?? {}, req.file ? leaveAttachmentUrl(req.file.filename) : undefined));
}

export async function cancelLeave(req: Request, res: Response) {
  return resultResponse(res, await cancelPendingLeave(context(req), req.params.id));
}

export async function approveLeave(req: Request, res: Response) {
  return resultResponse(res, await reviewLeave(context(req), req.params.id, "approve", req.body ?? {}));
}

export async function rejectLeave(req: Request, res: Response) {
  return resultResponse(res, await reviewLeave(context(req), req.params.id, "reject", req.body ?? {}));
}

export async function activateTakeover(req: Request, res: Response) {
  return resultResponse(res, await startTakeover(context(req), req.params.id));
}

export async function emergencyTakeover(req: Request, res: Response) {
  return resultResponse(
    res,
    await createEmergencyTakeover(context(req), req.body ?? {}),
    201,
  );
}

export async function endTakeover(req: Request, res: Response) {
  return resultResponse(res, await finishTakeover(context(req), req.params.id, "complete"));
}

export async function cancelTakeover(req: Request, res: Response) {
  return resultResponse(res, await finishTakeover(context(req), req.params.id, "cancel"));
}

export async function activities(req: Request, res: Response) {
  const rows = await takeoverActivities(String(req.user!.sub), String(req.user!.role), req.params.id);
  if (rows === null) return res.status(404).json({ ok: false, message: "Leave request not found" });
  return res.json({ ok: true, activities: rows });
}

export async function audits(req: Request, res: Response) {
  return res.json({
    ok: true,
    audits: await leaveAuditLogs(req.params.id),
  });
}

export async function notifications(req: Request, res: Response) {
  return res.json({ ok: true, notifications: await listNotifications(String(req.user!.sub)) });
}

export async function readNotification(req: Request, res: Response) {
  await markNotificationRead(String(req.user!.sub), req.params.id);
  return res.json({ ok: true });
}

export async function readAllNotifications(req: Request, res: Response) {
  await markNotificationRead(String(req.user!.sub));
  return res.json({ ok: true });
}

export async function clearAllNotifications(req: Request, res: Response) {
  await clearNotifications(String(req.user!.sub));
  return res.json({ ok: true });
}

export async function takeoverWorkspace(req: Request, res: Response) {
  const workspace = await getTakeoverWorkspace(
    req.params.id,
    typeof req.query.date === "string" ? req.query.date : undefined,
  );
  if (!workspace)
    return res
      .status(404)
      .json({ ok: false, message: "Active takeover not found" });
  await recordTakeoverWorkspaceAccess(
    context(req),
    req.params.id,
    typeof req.query.tool === "string" ? req.query.tool : undefined,
  );
  return res.json({ ok: true, workspace });
}

export async function takeoverAttendance(req: Request, res: Response) {
  const result = await saveTakeoverAttendance(
    context(req),
    req.params.id,
    req.body ?? {},
  );
  if ("error" in result)
    return res.status(result.status ?? 400).json({ ok: false, message: result.error });
  return res.json({ ok: true, saved: result.saved });
}

export async function takeoverAssignment(req: Request, res: Response) {
  const result = await createTakeoverAssignment(
    context(req),
    req.params.id,
    req.body ?? {},
  );
  if ("error" in result)
    return res.status(result.status ?? 400).json({ ok: false, message: result.error });
  return res.status(201).json({ ok: true, assignment: result.assignment });
}

export async function takeoverGrades(req: Request, res: Response) {
  const grades = await getTakeoverGrades(req.params.id, {
    section:
      typeof req.query.section === "string" ? req.query.section : undefined,
    gradeLevel:
      typeof req.query.gradeLevel === "string"
        ? req.query.gradeLevel
        : undefined,
    subject:
      typeof req.query.subject === "string" ? req.query.subject : undefined,
    term: typeof req.query.term === "string" ? req.query.term : undefined,
  });
  if (!grades)
    return res
      .status(404)
      .json({ ok: false, message: "Active takeover not found" });
  return res.json({ ok: true, ...grades });
}

export async function updateTakeoverGrades(req: Request, res: Response) {
  const result = await saveTakeoverGrades(
    context(req),
    req.params.id,
    req.body,
  );
  if ("error" in result)
    return res.status(result.status ?? 400).json({ ok: false, message: result.error });
  return res.json({ ok: true, saved: result.saved });
}
