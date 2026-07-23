"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventNotificationRead = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class EventNotificationRead extends sequelize_1.Model {
}
exports.EventNotificationRead = EventNotificationRead;
EventNotificationRead.init({
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    eventId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "event_id", references: { model: "school_events", key: "id" }, onDelete: "CASCADE" },
    userId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id", references: { model: "users", key: "id" }, onDelete: "CASCADE" },
}, { sequelize: db_1.sequelize, tableName: "event_notification_reads", timestamps: true, underscored: true, indexes: [{ unique: true, fields: ["event_id", "user_id"] }] });
