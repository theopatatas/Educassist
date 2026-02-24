import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class QuestionBank extends Model {
  declare id: number;
  declare subjectId: number | null;
  declare outcomeId: number | null;
  declare difficulty: number;
  declare questionText: string;
  declare choicesJson: string | null;
  declare correctAnswer: string | null;
  declare explanation: string | null;
}

QuestionBank.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    subjectId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "subject_id",
      references: { model: "subjects", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    outcomeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "outcome_id",
      references: { model: "outcomes", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    difficulty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "question_text",
    },
    choicesJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "choices_json",
    },
    correctAnswer: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "correct_answer",
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "question_bank",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["subject_id"] }, { fields: ["outcome_id"] }],
  }
);
