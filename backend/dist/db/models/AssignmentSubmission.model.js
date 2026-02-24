"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentSubmission = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class AssignmentSubmission extends sequelize_1.Model {
}
exports.AssignmentSubmission = AssignmentSubmission;
AssignmentSubmission.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    assignmentId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "assignment_id",
        references: { model: "assignments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    studentId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "student_id",
        references: { model: "students", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    submittedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "submitted_at",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "assignment_submissions",
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ["assignment_id"] },
        { fields: ["student_id"] },
        { unique: true, fields: ["assignment_id", "student_id"] },
    ],
});
