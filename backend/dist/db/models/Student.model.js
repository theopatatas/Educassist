"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Student = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Student extends sequelize_1.Model {
}
exports.Student = Student;
Student.init({
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
    lrn: {
        type: sequelize_1.DataTypes.STRING(32),
        allowNull: false,
        unique: true,
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
    middleName: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
        field: "middle_name",
    },
    birthDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
        field: "birth_date",
    },
    gender: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
    },
    guardianContact: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        field: "guardian_contact",
    },
    yearLevel: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "year_level",
    },
    sectionId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "section_id",
        references: { model: "sections", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "students",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"], unique: true }],
});
