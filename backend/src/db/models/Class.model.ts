import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Class extends Model {
  declare id: number;
  declare teacherId: number;
  declare sectionId: number | null;
  declare subjectId: number | null;
  declare name: string | null;
  declare gradeLevel: string | null;
  declare meetingDay: string | null;
  declare meetingTime: string | null;
}

Class.init(
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
    sectionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "section_id",
      references: { model: "sections", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    subjectId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "subject_id",
      references: { model: "subjects", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    gradeLevel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "grade_level",
    },
    meetingDay: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "meeting_day",
    },
    meetingTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "meeting_time",
    },
  },
  {
    sequelize,
    tableName: "classes",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["teacher_id"] }],
  }
);
