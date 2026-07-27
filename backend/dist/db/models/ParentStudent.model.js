"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentStudent = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class ParentStudent extends sequelize_1.Model {
}
exports.ParentStudent = ParentStudent;
ParentStudent.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    parentId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "parent_id",
        references: { model: "parents", key: "id" },
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
}, {
    sequelize: db_1.sequelize,
    tableName: "parent_students",
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ["parent_id", "student_id"] },
        { fields: ["student_id"] },
    ],
});
