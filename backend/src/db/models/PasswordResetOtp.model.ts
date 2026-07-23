import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class PasswordResetOtp extends Model {
  declare id: number;
  declare userId: number;
  declare otpHash: string;
  declare expiresAt: Date;
  declare verifiedAt: Date | null;
  declare usedAt: Date | null;
}

PasswordResetOtp.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "user_id",
    },
    otpHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "otp_hash",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "verified_at",
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "used_at",
    },
  },
  {
    sequelize,
    tableName: "password_reset_otps",
    timestamps: true,
    underscored: true,
  }
);
