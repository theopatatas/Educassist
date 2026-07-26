"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassTakeover = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class ClassTakeover extends sequelize_1.Model {
}
exports.ClassTakeover = ClassTakeover;
ClassTakeover.init({
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    leaveRequestId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true, field: "leave_request_id" },
    status: {
        type: sequelize_1.DataTypes.ENUM("NOT_STARTED", "ACTIVE", "COMPLETED", "CANCELLED"),
        allowNull: false,
        defaultValue: "NOT_STARTED",
    },
    activatedByUserId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "activated_by_user_id" },
    startedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true, field: "started_at" },
    endedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true, field: "ended_at" },
    cancelledAt: { type: sequelize_1.DataTypes.DATE, allowNull: true, field: "cancelled_at" },
    completionSummary: { type: sequelize_1.DataTypes.TEXT, allowNull: true, field: "completion_summary" },
}, { sequelize: db_1.sequelize, tableName: "class_takeovers", timestamps: true, underscored: true });
