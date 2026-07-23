"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetOtp = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class PasswordResetOtp extends sequelize_1.Model {
}
exports.PasswordResetOtp = PasswordResetOtp;
PasswordResetOtp.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "user_id",
    },
    otpHash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        field: "otp_hash",
    },
    expiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
    },
    verifiedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "verified_at",
    },
    usedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "used_at",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "password_reset_otps",
    timestamps: true,
    underscored: true,
});
