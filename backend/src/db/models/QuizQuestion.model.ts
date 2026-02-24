import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class QuizQuestion extends Model {
  declare id: number;
  declare quizId: number;
  declare questionId: number;
  declare order: number;
}

QuizQuestion.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    quizId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "quiz_id",
      references: { model: "quizzes", key: "id" },
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
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "quiz_questions",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["quiz_id", "question_id"], unique: true }],
  }
);
