"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TakeoverActivity = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class TakeoverActivity extends sequelize_1.Model {
}
exports.TakeoverActivity = TakeoverActivity;
TakeoverActivity.init({
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    takeoverId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "takeover_id" },
    classId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "class_id" },
    userId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
    action: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    previousValue: { type: sequelize_1.DataTypes.JSON, allowNull: true, field: "previous_value" },
    newValue: { type: sequelize_1.DataTypes.JSON, allowNull: true, field: "new_value" },
    details: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
}, {
    sequelize: db_1.sequelize,
    tableName: "takeover_activities",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ["takeover_id", "created_at"] }],
});
