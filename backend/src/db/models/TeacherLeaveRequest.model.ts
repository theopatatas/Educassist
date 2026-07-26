import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export type LeaveStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "ACTIVE_LEAVE"
  | "COMPLETED";

export class TeacherLeaveRequest extends Model {
  declare id: number;
  declare teacherId: number;
  declare leaveType: string;
  declare reason: string;
  declare startDate: string;
  declare endDate: string;
  declare totalDays: number;
  declare status: LeaveStatus;
  declare attachmentUrl: string | null;
  declare reviewNote: string | null;
  declare rejectionReason: string | null;
  declare reviewedByUserId: number | null;
  declare reviewedAt: Date | null;
  declare submittedAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

TeacherLeaveRequest.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    teacherId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "teacher_id" },
    leaveType: { type: DataTypes.STRING(60), allowNull: false, field: "leave_type" },
    reason: { type: DataTypes.TEXT, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: "start_date" },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: "end_date" },
    totalDays: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: "total_days" },
    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "CANCELLED", "ACTIVE_LEAVE", "COMPLETED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    attachmentUrl: { type: DataTypes.STRING(500), allowNull: true, field: "attachment_url" },
    reviewNote: { type: DataTypes.TEXT, allowNull: true, field: "review_note" },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true, field: "rejection_reason" },
    reviewedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "reviewed_by_user_id" },
    reviewedAt: { type: DataTypes.DATE, allowNull: true, field: "reviewed_at" },
    submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "submitted_at" },
  },
  {
    sequelize,
    tableName: "teacher_leave_requests",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["teacher_id", "status"] },
      { fields: ["start_date", "end_date"] },
    ],
  },
);
