"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exam = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Exam extends sequelize_1.Model {
}
exports.Exam = Exam;
Exam.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    teacherId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "teacher_id",
        references: { model: "teachers", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    classId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "class_id",
        references: { model: "classes", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
    },
    title: {
        type: sequelize_1.DataTypes.STRING(180),
        allowNull: false,
    },
    examDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: "exam_date",
    },
    startTime: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "start_time",
    },
    duration: {
        type: sequelize_1.DataTypes.STRING(40),
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "Scheduled",
    },
    room: {
        type: sequelize_1.DataTypes.STRING(80),
        allowNull: true,
    },
    coverageJson: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        field: "coverage_json",
    },
    gradingStatus: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        field: "grading_status",
        defaultValue: "Not Started",
    },
    publishResults: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        field: "publish_results",
        defaultValue: false,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "exams",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["teacher_id"] }, { fields: ["class_id"] }],
});
