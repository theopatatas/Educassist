"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolEvent = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("../../config/db");
class SchoolEvent extends sequelize_1.Model {
}
exports.SchoolEvent = SchoolEvent;
SchoolEvent.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    title: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    category: { type: sequelize_1.DataTypes.STRING(60), allowNull: false },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    eventDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: "event_date",
    },
    endDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true, field: "end_date" },
    startTime: { type: sequelize_1.DataTypes.TIME, allowNull: true, field: "start_time" },
    endTime: { type: sequelize_1.DataTypes.TIME, allowNull: true, field: "end_time" },
    location: { type: sequelize_1.DataTypes.STRING(200), allowNull: true },
    targetAudience: {
        type: sequelize_1.DataTypes.STRING(120),
        allowNull: false,
        field: "target_audience",
    },
    status: {
        type: sequelize_1.DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "Scheduled",
    },
    createdBy: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: "created_by",
        references: { model: "users", key: "id" },
    },
}, {
    sequelize: db_1.sequelize,
    tableName: "school_events",
    timestamps: true,
    underscored: true,
});
