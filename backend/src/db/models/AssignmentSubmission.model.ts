import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class AssignmentSubmission extends Model {
  declare id: number;
  declare assignmentId: number;
  declare studentId: number;
  declare submittedAt: Date | null;
}

AssignmentSubmission.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    assignmentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "assignment_id",
      references: { model: "assignments", key: "id" },
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
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "submitted_at",
    },
  },
  {
    sequelize,
    tableName: "assignment_submissions",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["assignment_id"] },
      { fields: ["student_id"] },
      { unique: true, fields: ["assignment_id", "student_id"] },
    ],
  }
);

