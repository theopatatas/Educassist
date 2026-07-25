import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class LessonPlan extends Model {
  declare id: number;
  declare teacherId: number;
  declare title: string;
  declare subject: string;
  declare gradeLevel: string;
  declare topic: string;
  declare contentJson: unknown;
  declare status: "draft" | "final";
  declare createdAt: Date;
  declare updatedAt: Date;
}

LessonPlan.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    teacherId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "teacher_id",
      references: { model: "teachers", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    subject: { type: DataTypes.STRING(160), allowNull: false },
    gradeLevel: {
      type: DataTypes.STRING(60),
      allowNull: false,
      field: "grade_level",
    },
    topic: { type: DataTypes.STRING(240), allowNull: false },
    contentJson: {
      type: DataTypes.JSON,
      allowNull: false,
      field: "content_json",
    },
    status: {
      type: DataTypes.ENUM("draft", "final"),
      allowNull: false,
      defaultValue: "draft",
    },
  },
  {
    sequelize,
    tableName: "lesson_plans",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["teacher_id"] }],
  },
);
