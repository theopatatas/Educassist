"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Teacher = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Teacher extends sequelize_1.Model {
}
exports.Teacher = Teacher;
Teacher.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
        field: "user_id",
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    firstName: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        field: "first_name",
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        field: "last_name",
    },
    employeeNumber: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        field: "employee_number",
    },
    sectionId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "section_id",
        references: { model: "sections", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
    },
    gradeLevel: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "grade_level",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "teachers",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"], unique: true }],
});
