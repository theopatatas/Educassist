"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subject = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Subject extends sequelize_1.Model {
}
exports.Subject = Subject;
Subject.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(120),
        allowNull: false,
    },
    code: {
        type: sequelize_1.DataTypes.STRING(40),
        allowNull: true,
    },
    createdByAdmin: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        field: "created_by_admin",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "subjects",
    timestamps: true,
    underscored: true,
});
