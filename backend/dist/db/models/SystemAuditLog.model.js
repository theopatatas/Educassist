"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemAuditLog = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class SystemAuditLog extends sequelize_1.Model {
}
exports.SystemAuditLog = SystemAuditLog;
SystemAuditLog.init({
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
    role: { type: sequelize_1.DataTypes.STRING(40), allowNull: false },
    action: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    entityType: { type: sequelize_1.DataTypes.STRING(80), allowNull: false, field: "entity_type" },
    entityId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "entity_id" },
    affectedTeacherId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "affected_teacher_id" },
    affectedClassIds: { type: sequelize_1.DataTypes.JSON, allowNull: true, field: "affected_class_ids" },
    ipAddress: { type: sequelize_1.DataTypes.STRING(80), allowNull: true, field: "ip_address" },
    deviceInfo: { type: sequelize_1.DataTypes.STRING(500), allowNull: true, field: "device_info" },
    metadata: { type: sequelize_1.DataTypes.JSON, allowNull: true },
}, {
    sequelize: db_1.sequelize,
    tableName: "system_audit_logs",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ["entity_type", "entity_id", "created_at"] }],
});
