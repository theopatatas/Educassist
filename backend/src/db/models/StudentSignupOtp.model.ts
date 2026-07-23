import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class StudentSignupOtp extends Model {
  declare id: number;
  declare email: string;
  declare otpHash: string;
  declare payload: string;
  declare expiresAt: Date;
  declare usedAt: Date | null;
}

StudentSignupOtp.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    otpHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "otp_hash",
    },
    payload: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "used_at",
    },
  },
  {
    sequelize,
    tableName: "student_signup_otps",
    timestamps: true,
    underscored: true,
  }
);
