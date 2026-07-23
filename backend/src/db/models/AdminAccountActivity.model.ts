import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class AdminAccountActivity extends Model {
  declare id: number;
  declare adminUserId: number;
  declare actorUserId: number;
  declare action: string;
  declare details: string | null;
  declare createdAt: Date;
}

AdminAccountActivity.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    adminUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "admin_user_id",
    },
    actorUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "actor_user_id",
    },
    action: { type: DataTypes.STRING(80), allowNull: false },
    details: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    sequelize,
    tableName: "admin_account_activities",
    timestamps: true,
    updatedAt: false,
    underscored: true,
  },
);
