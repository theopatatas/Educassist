import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class User extends Model {
  declare id: number;
  declare email: string;
  declare passwordHash: string | null;
  declare role: string;
  declare refreshTokenHash: string | null;
  declare googleSub: string | null;
  declare lrn: string | null;
  declare isActive: boolean;
  declare lastLoginAt: Date | null;
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.ENUM("ADMIN", "TEACHER", "STUDENT", "PARENT"),
      allowNull: false,
      defaultValue: "STUDENT",
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    googleSub: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "google_sub",
    },
    lrn: {
      type: DataTypes.STRING(32),
      allowNull: true,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "password_hash",
    },
    refreshTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "refresh_token_hash",
    },
    isActive: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      field: "is_active",
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login_at",
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    underscored: true,
  }
);
