"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Intervention = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Intervention extends sequelize_1.Model {
}
exports.Intervention = Intervention;
Intervention.init({
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
    teacherId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "teacher_id",
        references: { model: "teachers", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    note: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "interventions",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["student_id"] }],
});
