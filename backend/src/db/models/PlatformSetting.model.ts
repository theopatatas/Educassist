import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class PlatformSetting extends Model {
  declare id: number;
  declare general: Record<string, unknown> | null;
  declare academic: Record<string, unknown> | null;
  declare userManagement: Record<string, unknown> | null;
  declare security: Record<string, unknown> | null;
  declare notifications: Record<string, unknown> | null;
  declare appearance: Record<string, unknown> | null;
  declare logoUrl: string | null;
  declare updatedBy: number | null;
}

PlatformSetting.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, defaultValue: 1 },
    general: { type: DataTypes.JSON, allowNull: true },
    academic: { type: DataTypes.JSON, allowNull: true },
    userManagement: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "user_management",
    },
    security: { type: DataTypes.JSON, allowNull: true },
    notifications: { type: DataTypes.JSON, allowNull: true },
    appearance: { type: DataTypes.JSON, allowNull: true },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "logo_url",
    },
    updatedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "updated_by",
    },
  },
  {
    sequelize,
    tableName: "platform_settings",
    timestamps: true,
    underscored: true,
  },
);
