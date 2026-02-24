import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Exam extends Model {
  declare id: number;
  declare teacherId: number;
  declare classId: number | null;
  declare title: string;
  declare examDate: string;
  declare startTime: string | null;
  declare duration: string;
  declare status: string;
  declare room: string | null;
  declare coverageJson: unknown;
  declare gradingStatus: string;
  declare publishResults: boolean;
}

Exam.init(
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
    classId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "class_id",
      references: { model: "classes", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    examDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "exam_date",
    },
    startTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "start_time",
    },
    duration: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Scheduled",
    },
    room: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    coverageJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "coverage_json",
    },
    gradingStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "grading_status",
      defaultValue: "Not Started",
    },
    publishResults: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: "publish_results",
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "exams",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["teacher_id"] }, { fields: ["class_id"] }],
  }
);
