"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatLog = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class ChatLog extends sequelize_1.Model {
}
exports.ChatLog = ChatLog;
ChatLog.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "user_id",
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    role: {
        type: sequelize_1.DataTypes.STRING(30),
        allowNull: false,
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    summary: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "chat_logs",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"] }],
});
