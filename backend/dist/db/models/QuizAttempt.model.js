"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizAttempt = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class QuizAttempt extends sequelize_1.Model {
}
exports.QuizAttempt = QuizAttempt;
QuizAttempt.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    quizId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "quiz_id",
        references: { model: "quizzes", key: "id" },
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
    startedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "started_at",
    },
    completedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "completed_at",
    },
    score: {
        type: sequelize_1.DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "quiz_attempts",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["quiz_id", "student_id"] }],
});
