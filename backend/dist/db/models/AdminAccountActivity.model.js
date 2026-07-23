"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAccountActivity = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class AdminAccountActivity extends sequelize_1.Model {
}
exports.AdminAccountActivity = AdminAccountActivity;
AdminAccountActivity.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    adminUserId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "admin_user_id",
    },
    actorUserId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "actor_user_id",
    },
    action: { type: sequelize_1.DataTypes.STRING(80), allowNull: false },
    details: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
}, {
    sequelize: db_1.sequelize,
    tableName: "admin_account_activities",
    timestamps: true,
    updatedAt: false,
    underscored: true,
});
