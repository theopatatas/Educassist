"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherLeaveRequest = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class TeacherLeaveRequest extends sequelize_1.Model {
}
exports.TeacherLeaveRequest = TeacherLeaveRequest;
TeacherLeaveRequest.init({
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    teacherId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "teacher_id" },
    leaveType: { type: sequelize_1.DataTypes.STRING(60), allowNull: false, field: "leave_type" },
    reason: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
    startDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, field: "start_date" },
    endDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, field: "end_date" },
    totalDays: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "total_days" },
    status: {
        type: sequelize_1.DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "CANCELLED", "ACTIVE_LEAVE", "COMPLETED"),
        allowNull: false,
        defaultValue: "PENDING",
    },
    attachmentUrl: { type: sequelize_1.DataTypes.STRING(500), allowNull: true, field: "attachment_url" },
    reviewNote: { type: sequelize_1.DataTypes.TEXT, allowNull: true, field: "review_note" },
    rejectionReason: { type: sequelize_1.DataTypes.TEXT, allowNull: true, field: "rejection_reason" },
    reviewedByUserId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "reviewed_by_user_id" },
    reviewedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true, field: "reviewed_at" },
    submittedAt: { type: sequelize_1.DataTypes.DATE, allowNull: false, defaultValue: sequelize_1.DataTypes.NOW, field: "submitted_at" },
}, {
    sequelize: db_1.sequelize,
    tableName: "teacher_leave_requests",
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ["teacher_id", "status"] },
        { fields: ["start_date", "end_date"] },
    ],
});
