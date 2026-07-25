"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonPlan = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class LessonPlan extends sequelize_1.Model {
}
exports.LessonPlan = LessonPlan;
LessonPlan.init({
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
    title: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    subject: { type: sequelize_1.DataTypes.STRING(160), allowNull: false },
    gradeLevel: {
        type: sequelize_1.DataTypes.STRING(60),
        allowNull: false,
        field: "grade_level",
    },
    topic: { type: sequelize_1.DataTypes.STRING(240), allowNull: false },
    contentJson: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        field: "content_json",
    },
    status: {
        type: sequelize_1.DataTypes.ENUM("draft", "final"),
        allowNull: false,
        defaultValue: "draft",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "lesson_plans",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["teacher_id"] }],
});
