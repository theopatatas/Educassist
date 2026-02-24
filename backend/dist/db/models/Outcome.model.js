"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Outcome = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Outcome extends sequelize_1.Model {
}
exports.Outcome = Outcome;
Outcome.init({
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
    code: {
        type: sequelize_1.DataTypes.STRING(40),
        allowNull: true,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "outcomes",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["subject_id"] }],
});
