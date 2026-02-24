"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveTrace = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class AdaptiveTrace extends sequelize_1.Model {
}
exports.AdaptiveTrace = AdaptiveTrace;
AdaptiveTrace.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    studentId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "student_id",
        references: { model: "students", key: "id" },
        onDelete: "CASCADE",
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
    masteryBefore: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: "mastery_before",
        defaultValue: 0,
    },
    masteryAfter: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: "mastery_after",
        defaultValue: 0,
    },
    delta: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    difficulty: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    metadataJson: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        field: "metadata_json",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "adaptive_traces",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["student_id"] }],
});
