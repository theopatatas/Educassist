import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Quiz extends Model {
  declare id: number;
  declare classId: number | null;
  declare title: string;
  declare settingsJson: string | null;
  declare timeLimit: number | null;
  declare attemptLimit: number | null;
}

Quiz.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    classId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "class_id",
      references: { model: "classes", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    settingsJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "settings_json",
    },
    timeLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "time_limit",
    },
    attemptLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "attempt_limit",
    },
  },
  {
    sequelize,
    tableName: "quizzes",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["class_id"] }],
  }
);
