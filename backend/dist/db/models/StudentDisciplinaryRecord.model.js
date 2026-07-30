"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentDisciplinaryRecord = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class StudentDisciplinaryRecord extends sequelize_1.Model {
}
exports.StudentDisciplinaryRecord = StudentDisciplinaryRecord;
StudentDisciplinaryRecord.init({
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    studentId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "student_id" },
    academicYear: { type: sequelize_1.DataTypes.STRING(20), allowNull: false, field: "academic_year" },
    incidentDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, field: "incident_date" },
    incidentType: { type: sequelize_1.DataTypes.STRING(80), allowNull: false, field: "incident_type" },
    severity: { type: sequelize_1.DataTypes.STRING(24), allowNull: false },
    status: { type: sequelize_1.DataTypes.STRING(24), allowNull: false, defaultValue: "OPEN" },
    title: { type: sequelize_1.DataTypes.STRING(160), allowNull: false },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
    actionTaken: { type: sequelize_1.DataTypes.TEXT, allowNull: true, field: "action_taken" },
    resolutionNotes: { type: sequelize_1.DataTypes.TEXT, allowNull: true, field: "resolution_notes" },
    resolvedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true, field: "resolved_at" },
    archivedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true, field: "archived_at" },
    createdById: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "created_by_id" },
    updatedById: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "updated_by_id" },
}, {
    sequelize: db_1.sequelize,
    tableName: "student_disciplinary_records",
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ["student_id", "academic_year"] },
        { fields: ["student_id", "status"] },
        { fields: ["incident_date"] },
    ],
});
