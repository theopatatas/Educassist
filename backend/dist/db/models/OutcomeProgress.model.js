"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutcomeProgress = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class OutcomeProgress extends sequelize_1.Model {
}
exports.OutcomeProgress = OutcomeProgress;
OutcomeProgress.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    outcomeId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "outcome_id",
        references: { model: "outcomes", key: "id" },
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
    masteryScore: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "mastery_score",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "outcome_progress",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["outcome_id", "student_id"], unique: true }],
});
