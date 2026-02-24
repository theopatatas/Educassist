"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradeItem = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class GradeItem extends sequelize_1.Model {
}
exports.GradeItem = GradeItem;
GradeItem.init({
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
    name: {
        type: sequelize_1.DataTypes.STRING(160),
        allowNull: false,
    },
    weight: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1.0,
    },
    maxScore: {
        type: sequelize_1.DataTypes.DECIMAL(6, 2),
        allowNull: false,
        field: "max_score",
        defaultValue: 100,
    },
    dueDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: true,
        field: "due_date",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "grade_items",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["class_id"] }],
});
