"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentSignupOtp = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class StudentSignupOtp extends sequelize_1.Model {
}
exports.StudentSignupOtp = StudentSignupOtp;
StudentSignupOtp.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    otpHash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        field: "otp_hash",
    },
    payload: {
        type: sequelize_1.DataTypes.TEXT("long"),
        allowNull: false,
    },
    expiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
    },
    usedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "used_at",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "student_signup_otps",
    timestamps: true,
    underscored: true,
});
