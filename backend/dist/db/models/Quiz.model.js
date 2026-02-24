"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Quiz = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Quiz extends sequelize_1.Model {
}
exports.Quiz = Quiz;
Quiz.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
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
        type: sequelize_1.DataTypes.STRING(160),
        allowNull: false,
    },
    settingsJson: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        field: "settings_json",
    },
    timeLimit: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: "time_limit",
    },
    attemptLimit: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        field: "attempt_limit",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "quizzes",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["class_id"] }],
});
