"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    role: {
        type: sequelize_1.DataTypes.ENUM("ADMIN", "TEACHER", "STUDENT", "PARENT"),
        allowNull: false,
        defaultValue: "STUDENT",
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    googleSub: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        field: "google_sub",
    },
    lrn: {
        type: sequelize_1.DataTypes.STRING(32),
        allowNull: true,
        unique: true,
    },
    passwordHash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        field: "password_hash",
    },
    refreshTokenHash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        field: "refresh_token_hash",
    },
    isActive: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        field: "is_active",
    },
    lastLoginAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "last_login_at",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "users",
    timestamps: true,
    underscored: true,
});
