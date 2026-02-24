"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionBank = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class QuestionBank extends sequelize_1.Model {
}
exports.QuestionBank = QuestionBank;
QuestionBank.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    subjectId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "subject_id",
        references: { model: "subjects", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
    },
    outcomeId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "outcome_id",
        references: { model: "outcomes", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
    },
    difficulty: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    questionText: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        field: "question_text",
    },
    choicesJson: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        field: "choices_json",
    },
    correctAnswer: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        field: "correct_answer",
    },
    explanation: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "question_bank",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["subject_id"] }, { fields: ["outcome_id"] }],
});
