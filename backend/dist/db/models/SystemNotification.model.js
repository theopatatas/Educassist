"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemNotification = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class SystemNotification extends sequelize_1.Model {
}
exports.SystemNotification = SystemNotification;
SystemNotification.init({
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
    title: { type: sequelize_1.DataTypes.STRING(160), allowNull: false },
    message: { type: sequelize_1.DataTypes.STRING(500), allowNull: false },
    category: { type: sequelize_1.DataTypes.STRING(60), allowNull: false },
    href: { type: sequelize_1.DataTypes.STRING(300), allowNull: true },
    readAt: { type: sequelize_1.DataTypes.DATE, allowNull: true, field: "read_at" },
}, {
    sequelize: db_1.sequelize,
    tableName: "system_notifications",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ["user_id", "read_at", "created_at"] }],
});
