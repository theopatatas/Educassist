"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStudentDisciplinaryRecords = listStudentDisciplinaryRecords;
exports.createStudentDisciplinaryRecord = createStudentDisciplinaryRecord;
exports.updateStudentDisciplinaryRecord = updateStudentDisciplinaryRecord;
const sequelize_1 = require("sequelize");
const Student_model_1 = require("../../db/models/Student.model");
const StudentDisciplinaryRecord_model_1 = require("../../db/models/StudentDisciplinaryRecord.model");
const SystemAuditLog_model_1 = require("../../db/models/SystemAuditLog.model");
const User_model_1 = require("../../db/models/User.model");
const settings_service_1 = require("../admin/settings.service");
const SEVERITIES = new Set(["MINOR", "MODERATE", "MAJOR", "CRITICAL"]);
const STATUSES = new Set(["OPEN", "UNDER_REVIEW", "RESOLVED", "ARCHIVED"]);
function cleanText(value, max) {
    return String(value ?? "").trim().slice(0, max);
}
function serialize(record, creatorName) {
    return {
        id: Number(record.id),
        studentId: Number(record.studentId),
        academicYear: record.academicYear,
        incidentDate: record.incidentDate,
        incidentType: record.incidentType,
        severity: record.severity,
        status: record.status,
        title: record.title,
        description: record.description,
        actionTaken: record.actionTaken,
        resolutionNotes: record.resolutionNotes,
        resolvedAt: record.resolvedAt,
        archivedAt: record.archivedAt,
        createdBy: creatorName || null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
}
async function currentAcademicYear() {
    const academic = await (0, settings_service_1.getAcademicContext)();
    return String(academic.currentSchoolYear ?? "").trim();
}
async function audit(context, action, record, metadata) {
    await SystemAuditLog_model_1.SystemAuditLog.create({
        userId: context.userId,
        role: context.role,
        action,
        entityType: "student_disciplinary_record",
        entityId: record.id,
        affectedTeacherId: null,
        affectedClassIds: null,
        ipAddress: context.ipAddress ?? null,
        deviceInfo: context.deviceInfo ?? null,
        metadata: { studentId: record.studentId, academicYear: record.academicYear, ...metadata },
    });
}
async function listStudentDisciplinaryRecords(studentId, filters) {
    if (!(await Student_model_1.Student.findByPk(studentId)))
        return null;
    const activeYear = await currentAcademicYear();
    const where = { studentId };
    if (filters.academicYear !== "ALL" && (filters.academicYear || activeYear))
        Object.assign(where, { academicYear: filters.academicYear || activeYear });
    if (filters.status && filters.status !== "ALL")
        Object.assign(where, { status: filters.status });
    if (filters.severity && filters.severity !== "ALL")
        Object.assign(where, { severity: filters.severity });
    if (filters.incidentType && filters.incidentType !== "ALL")
        Object.assign(where, { incidentType: filters.incidentType });
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize) || 10));
    const { rows, count } = await StudentDisciplinaryRecord_model_1.StudentDisciplinaryRecord.findAndCountAll({
        where,
        order: [["incidentDate", "DESC"], ["createdAt", "DESC"]],
        limit: pageSize,
        offset: (page - 1) * pageSize,
    });
    const creatorIds = [...new Set(rows.map((item) => Number(item.createdById)))];
    const users = creatorIds.length
        ? await User_model_1.User.findAll({ where: { id: { [sequelize_1.Op.in]: creatorIds } } })
        : [];
    const creatorMap = new Map(users.map((user) => [
        Number(user.id),
        user.displayName ||
            [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ") ||
            user.email,
    ]));
    const all = await StudentDisciplinaryRecord_model_1.StudentDisciplinaryRecord.findAll({
        where: { studentId },
        attributes: ["academicYear", "status"],
    });
    const academicYears = [...new Set(all.map((item) => item.academicYear))].sort().reverse();
    return {
        records: rows.map((item) => serialize(item, creatorMap.get(Number(item.createdById)))),
        currentAcademicYear: activeYear || null,
        currentYearCount: activeYear
            ? all.filter((item) => item.academicYear === activeYear).length
            : 0,
        currentYearActiveCount: activeYear
            ? all.filter((item) => item.academicYear === activeYear &&
                !["RESOLVED", "ARCHIVED"].includes(item.status)).length
            : 0,
        historicalCount: activeYear
            ? all.filter((item) => item.academicYear !== activeYear).length
            : 0,
        academicYears,
        total: count,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
}
function validate(input, partial = false) {
    const required = ["incidentDate", "incidentType", "severity", "title", "description"];
    if (!partial && required.some((key) => !cleanText(input[key], 4000)))
        return "Complete all required disciplinary record fields.";
    if (input.severity && !SEVERITIES.has(input.severity))
        return "Invalid severity.";
    if (input.status && !STATUSES.has(input.status))
        return "Invalid status.";
    if (input.incidentDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.incidentDate))
        return "Invalid incident date.";
    return null;
}
async function createStudentDisciplinaryRecord(studentId, input, context) {
    if (!(await Student_model_1.Student.findByPk(studentId)))
        return { ok: false, code: 404, message: "Student not found." };
    const academicYear = await currentAcademicYear();
    if (!academicYear)
        return { ok: false, code: 409, message: "Set the current Academic Year before adding a record." };
    const error = validate(input);
    if (error)
        return { ok: false, code: 400, message: error };
    const record = await StudentDisciplinaryRecord_model_1.StudentDisciplinaryRecord.create({
        studentId,
        academicYear,
        incidentDate: input.incidentDate,
        incidentType: cleanText(input.incidentType, 80),
        severity: input.severity,
        status: "OPEN",
        title: cleanText(input.title, 160),
        description: cleanText(input.description, 5000),
        actionTaken: cleanText(input.actionTaken, 5000) || null,
        resolutionNotes: null,
        resolvedAt: null,
        archivedAt: null,
        createdById: context.userId,
        updatedById: context.userId,
    });
    await audit(context, "STUDENT_DISCIPLINARY_RECORD_CREATED", record);
    return { ok: true, record: serialize(record) };
}
async function updateStudentDisciplinaryRecord(studentId, recordId, input, context) {
    const record = await StudentDisciplinaryRecord_model_1.StudentDisciplinaryRecord.findOne({ where: { id: recordId, studentId } });
    if (!record)
        return { ok: false, code: 404, message: "Disciplinary record not found." };
    const academicYear = await currentAcademicYear();
    if (!academicYear || record.academicYear !== academicYear)
        return { ok: false, code: 409, message: "Historical disciplinary records are read-only." };
    const error = validate(input, true);
    if (error)
        return { ok: false, code: 400, message: error };
    const nextStatus = input.status ?? record.status;
    const previousStatus = record.status;
    await record.update({
        incidentDate: input.incidentDate ?? record.incidentDate,
        incidentType: input.incidentType ? cleanText(input.incidentType, 80) : record.incidentType,
        severity: input.severity ?? record.severity,
        status: nextStatus,
        title: input.title ? cleanText(input.title, 160) : record.title,
        description: input.description ? cleanText(input.description, 5000) : record.description,
        actionTaken: input.actionTaken === undefined ? record.actionTaken : cleanText(input.actionTaken, 5000) || null,
        resolutionNotes: input.resolutionNotes === undefined
            ? record.resolutionNotes
            : cleanText(input.resolutionNotes, 5000) || null,
        resolvedAt: nextStatus === "RESOLVED" ? record.resolvedAt ?? new Date() : null,
        archivedAt: nextStatus === "ARCHIVED" ? record.archivedAt ?? new Date() : null,
        updatedById: context.userId,
    });
    await audit(context, "STUDENT_DISCIPLINARY_RECORD_UPDATED", record, {
        previousStatus,
        newStatus: nextStatus,
    });
    return { ok: true, record: serialize(record) };
}
