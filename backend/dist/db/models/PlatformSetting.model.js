"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformSetting = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class PlatformSetting extends sequelize_1.Model {
}
exports.PlatformSetting = PlatformSetting;
PlatformSetting.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, primaryKey: true, defaultValue: 1 },
    general: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    academic: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    userManagement: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        field: "user_management",
    },
    security: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    notifications: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    appearance: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    logoUrl: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
        field: "logo_url",
    },
    updatedBy: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "updated_by",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "platform_settings",
    timestamps: true,
    underscored: true,
});
