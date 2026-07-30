import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class StudentDisciplinaryRecord extends Model {
  declare id: number;
  declare studentId: number;
  declare academicYear: string;
  declare incidentDate: string;
  declare incidentType: string;
  declare severity: string;
  declare status: string;
  declare title: string;
  declare description: string;
  declare actionTaken: string | null;
  declare resolutionNotes: string | null;
  declare resolvedAt: Date | null;
  declare archivedAt: Date | null;
  declare createdById: number;
  declare updatedById: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

StudentDisciplinaryRecord.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    studentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "student_id" },
    academicYear: { type: DataTypes.STRING(20), allowNull: false, field: "academic_year" },
    incidentDate: { type: DataTypes.DATEONLY, allowNull: false, field: "incident_date" },
    incidentType: { type: DataTypes.STRING(80), allowNull: false, field: "incident_type" },
    severity: { type: DataTypes.STRING(24), allowNull: false },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "OPEN" },
    title: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    actionTaken: { type: DataTypes.TEXT, allowNull: true, field: "action_taken" },
    resolutionNotes: { type: DataTypes.TEXT, allowNull: true, field: "resolution_notes" },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: "resolved_at" },
    archivedAt: { type: DataTypes.DATE, allowNull: true, field: "archived_at" },
    createdById: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "created_by_id" },
    updatedById: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "updated_by_id" },
  },
  {
    sequelize,
    tableName: "student_disciplinary_records",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["student_id", "academic_year"] },
      { fields: ["student_id", "status"] },
      { fields: ["incident_date"] },
    ],
  },
);
