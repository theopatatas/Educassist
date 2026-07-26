import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class TakeoverActivity extends Model {
  declare id: number;
  declare takeoverId: number;
  declare classId: number | null;
  declare userId: number;
  declare action: string;
  declare previousValue: unknown;
  declare newValue: unknown;
  declare details: string | null;
  declare createdAt: Date;
}

TakeoverActivity.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    takeoverId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "takeover_id" },
    classId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "class_id" },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
    action: { type: DataTypes.STRING(100), allowNull: false },
    previousValue: { type: DataTypes.JSON, allowNull: true, field: "previous_value" },
    newValue: { type: DataTypes.JSON, allowNull: true, field: "new_value" },
    details: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "takeover_activities",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ["takeover_id", "created_at"] }],
  },
);
