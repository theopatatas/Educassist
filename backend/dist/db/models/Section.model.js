"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Section = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class Section extends sequelize_1.Model {
}
exports.Section = Section;
Section.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(120),
        allowNull: false,
    },
    schoolYear: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true,
        field: "school_year",
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "sections",
    timestamps: true,
    underscored: true,
});
