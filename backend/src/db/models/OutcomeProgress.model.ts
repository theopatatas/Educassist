import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class OutcomeProgress extends Model {
  declare id: number;
  declare outcomeId: number;
  declare studentId: number;
  declare masteryScore: number;
}

OutcomeProgress.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    outcomeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "outcome_id",
      references: { model: "outcomes", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    studentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "student_id",
      references: { model: "students", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    masteryScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "mastery_score",
    },
  },
  {
    sequelize,
    tableName: "outcome_progress",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["outcome_id", "student_id"], unique: true }],
  }
);
