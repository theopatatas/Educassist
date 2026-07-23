import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class User extends Model {
  declare id: number;
  declare email: string;
  declare firstName: string | null;
  declare middleName: string | null;
  declare lastName: string | null;
  declare mobileNumber: string | null;
  declare displayName: string | null;
  declare profilePhotoUrl: string | null;
  declare passwordChangedAt: Date | null;
  declare passwordHash: string | null;
  declare role: string;
  declare refreshTokenHash: string | null;
  declare googleSub: string | null;
  declare lrn: string | null;
  declare isActive: boolean;
  declare lastLoginAt: Date | null;
  declare createdById: number | null;
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.ENUM(
        "SUPER_ADMIN",
        "ADMIN",
        "TEACHER",
        "STUDENT",
        "PARENT",
      ),
      allowNull: false,
      defaultValue: "STUDENT",
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "first_name",
    },
    middleName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "middle_name",
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "last_name",
    },
    mobileNumber: {
      type: DataTypes.STRING(11),
      allowNull: true,
      field: "mobile_number",
    },
    displayName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "display_name",
    },
    profilePhotoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "profile_photo_url",
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "password_changed_at",
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
    createdById: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by_id",
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    underscored: true,
  },
);
