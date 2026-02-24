"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizQuestion = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class QuizQuestion extends sequelize_1.Model {
}
exports.QuizQuestion = QuizQuestion;
QuizQuestion.init({
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
    questionId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "question_id",
        references: { model: "question_bank", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    order: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "quiz_questions",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["quiz_id", "question_id"], unique: true }],
});
