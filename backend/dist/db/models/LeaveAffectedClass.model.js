"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveAffectedClass = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class LeaveAffectedClass extends sequelize_1.Model {
}
exports.LeaveAffectedClass = LeaveAffectedClass;
LeaveAffectedClass.init({
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    leaveRequestId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "leave_request_id" },
    classId: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "class_id" },
    subjectName: { type: sequelize_1.DataTypes.STRING(160), allowNull: true, field: "subject_name" },
    gradeLevel: { type: sequelize_1.DataTypes.STRING(40), allowNull: true, field: "grade_level" },
    sectionName: { type: sequelize_1.DataTypes.STRING(120), allowNull: true, field: "section_name" },
    schedule: { type: sequelize_1.DataTypes.STRING(160), allowNull: true },
    studentCount: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: "student_count" },
}, {
    sequelize: db_1.sequelize,
    tableName: "leave_affected_classes",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
        { unique: true, fields: ["leave_request_id", "class_id"] },
        { fields: ["class_id"] },
    ],
});
