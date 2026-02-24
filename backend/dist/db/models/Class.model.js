"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Class = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Class extends sequelize_1.Model {
}
exports.Class = Class;
Class.init({
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
    sectionId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "section_id",
        references: { model: "sections", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
    },
    subjectId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "subject_id",
        references: { model: "subjects", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
    },
    name: {
        type: sequelize_1.DataTypes.STRING(120),
        allowNull: true,
    },
    gradeLevel: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "grade_level",
    },
    meetingDay: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "meeting_day",
    },
    meetingTime: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "meeting_time",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "classes",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["teacher_id"] }],
});
