import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class QuizAttempt extends Model {
  declare id: number;
  declare quizId: number;
  declare studentId: number;
  declare startedAt: Date | null;
  declare completedAt: Date | null;
  declare score: number;
}

QuizAttempt.init(
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
    studentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "student_id",
      references: { model: "students", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "started_at",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },
    score: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "quiz_attempts",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["quiz_id", "student_id"] }],
  }
);
