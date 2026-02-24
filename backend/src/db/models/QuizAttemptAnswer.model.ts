import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class QuizAttemptAnswer extends Model {
  declare id: number;
  declare attemptId: number;
  declare questionId: number;
  declare answer: string | null;
  declare isCorrect: boolean | null;
  declare score: number | null;
}

QuizAttemptAnswer.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    attemptId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "attempt_id",
      references: { model: "quiz_attempts", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    questionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "question_id",
      references: { model: "question_bank", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isCorrect: {
      type: DataTypes.TINYINT,
      allowNull: true,
      field: "is_correct",
    },
    score: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "quiz_attempt_answers",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["attempt_id", "question_id"], unique: true }],
  }
);
