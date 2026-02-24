"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parent = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Parent extends sequelize_1.Model {
}
exports.Parent = Parent;
Parent.init({
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
    phone: {
        type: sequelize_1.DataTypes.STRING(40),
        allowNull: true,
    },
    studentId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: "student_id",
        references: { model: "students", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "parents",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"], unique: true }],
});
