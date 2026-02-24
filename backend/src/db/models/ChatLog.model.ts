import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class ChatLog extends Model {
  declare id: number;
  declare userId: number;
  declare role: string;
  declare message: string | null;
  declare summary: string | null;
}

ChatLog.init(
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
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    role: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "chat_logs",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"] }],
  }
);
