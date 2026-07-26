import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class LeaveAffectedClass extends Model {
  declare id: number;
  declare leaveRequestId: number;
  declare classId: number;
  declare subjectName: string | null;
  declare gradeLevel: string | null;
  declare sectionName: string | null;
  declare schedule: string | null;
  declare studentCount: number;
}

LeaveAffectedClass.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    leaveRequestId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "leave_request_id" },
    classId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "class_id" },
    subjectName: { type: DataTypes.STRING(160), allowNull: true, field: "subject_name" },
    gradeLevel: { type: DataTypes.STRING(40), allowNull: true, field: "grade_level" },
    sectionName: { type: DataTypes.STRING(120), allowNull: true, field: "section_name" },
    schedule: { type: DataTypes.STRING(160), allowNull: true },
    studentCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: "student_count" },
  },
  {
    sequelize,
    tableName: "leave_affected_classes",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ["leave_request_id", "class_id"] },
      { fields: ["class_id"] },
    ],
  },
);
