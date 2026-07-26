import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class SystemNotification extends Model {
  declare id: number;
  declare userId: number;
  declare title: string;
  declare message: string;
  declare category: string;
  declare href: string | null;
  declare readAt: Date | null;
  declare createdAt: Date;
}

SystemNotification.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
    title: { type: DataTypes.STRING(160), allowNull: false },
    message: { type: DataTypes.STRING(500), allowNull: false },
    category: { type: DataTypes.STRING(60), allowNull: false },
    href: { type: DataTypes.STRING(300), allowNull: true },
    readAt: { type: DataTypes.DATE, allowNull: true, field: "read_at" },
  },
  {
    sequelize,
    tableName: "system_notifications",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ["user_id", "read_at", "created_at"] }],
  },
);
