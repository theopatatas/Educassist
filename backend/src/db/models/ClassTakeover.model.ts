import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export type TakeoverStatus = "NOT_STARTED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export class ClassTakeover extends Model {
  declare id: number;
  declare leaveRequestId: number;
  declare status: TakeoverStatus;
  declare activatedByUserId: number | null;
  declare startedAt: Date | null;
  declare endedAt: Date | null;
  declare cancelledAt: Date | null;
  declare completionSummary: string | null;
}

ClassTakeover.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    leaveRequestId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true, field: "leave_request_id" },
    status: {
      type: DataTypes.ENUM("NOT_STARTED", "ACTIVE", "COMPLETED", "CANCELLED"),
      allowNull: false,
      defaultValue: "NOT_STARTED",
    },
    activatedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "activated_by_user_id" },
    startedAt: { type: DataTypes.DATE, allowNull: true, field: "started_at" },
    endedAt: { type: DataTypes.DATE, allowNull: true, field: "ended_at" },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: "cancelled_at" },
    completionSummary: { type: DataTypes.TEXT, allowNull: true, field: "completion_summary" },
  },
  { sequelize, tableName: "class_takeovers", timestamps: true, underscored: true },
);
