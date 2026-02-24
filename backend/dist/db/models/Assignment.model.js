"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Assignment = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Assignment extends sequelize_1.Model {
}
exports.Assignment = Assignment;
Assignment.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    teacherId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "teacher_id",
        references: { model: "teachers", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
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
        type: sequelize_1.DataTypes.STRING(180),
        allowNull: false,
    },
    dueDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: "due_date",
    },
    status: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "Active",
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "assignments",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["teacher_id"] }, { fields: ["class_id"] }],
});
