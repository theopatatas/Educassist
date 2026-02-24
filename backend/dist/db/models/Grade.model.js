"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grade = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Grade extends sequelize_1.Model {
}
exports.Grade = Grade;
Grade.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    gradeItemId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "grade_item_id",
        references: { model: "grade_items", key: "id" },
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
    score: {
        type: sequelize_1.DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "grades",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["grade_item_id", "student_id"], unique: true }],
});
