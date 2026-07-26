import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class SystemAuditLog extends Model {
  declare id: number;
  declare userId: number;
  declare role: string;
  declare action: string;
  declare entityType: string;
  declare entityId: number | null;
  declare affectedTeacherId: number | null;
  declare affectedClassIds: number[] | null;
  declare ipAddress: string | null;
  declare deviceInfo: string | null;
  declare metadata: unknown;
  declare createdAt: Date;
}

SystemAuditLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
    role: { type: DataTypes.STRING(40), allowNull: false },
    action: { type: DataTypes.STRING(100), allowNull: false },
    entityType: { type: DataTypes.STRING(80), allowNull: false, field: "entity_type" },
    entityId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "entity_id" },
    affectedTeacherId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "affected_teacher_id" },
    affectedClassIds: { type: DataTypes.JSON, allowNull: true, field: "affected_class_ids" },
    ipAddress: { type: DataTypes.STRING(80), allowNull: true, field: "ip_address" },
    deviceInfo: { type: DataTypes.STRING(500), allowNull: true, field: "device_info" },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    sequelize,
    tableName: "system_audit_logs",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ["entity_type", "entity_id", "created_at"] }],
  },
);
