"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Enrollment = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Enrollment extends sequelize_1.Model {
}
exports.Enrollment = Enrollment;
Enrollment.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    classId: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "class_id",
        references: { model: "classes", key: "id" },
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
    enrolledAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        field: "enrolled_at",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "enrollments",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["class_id", "student_id"], unique: true }],
});
