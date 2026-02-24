"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizAttemptAnswer = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class QuizAttemptAnswer extends sequelize_1.Model {
}
exports.QuizAttemptAnswer = QuizAttemptAnswer;
QuizAttemptAnswer.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    attemptId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "attempt_id",
        references: { model: "quiz_attempts", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    questionId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "question_id",
        references: { model: "question_bank", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    answer: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    isCorrect: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: true,
        field: "is_correct",
    },
    score: {
        type: sequelize_1.DataTypes.DECIMAL(6, 2),
        allowNull: true,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "quiz_attempt_answers",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["attempt_id", "question_id"], unique: true }],
});
