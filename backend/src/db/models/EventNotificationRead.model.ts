import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class EventNotificationRead extends Model {
  declare id: number;
  declare eventId: number;
  declare userId: number;
}

EventNotificationRead.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    eventId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "event_id", references: { model: "school_events", key: "id" }, onDelete: "CASCADE" },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id", references: { model: "users", key: "id" }, onDelete: "CASCADE" },
  },
  { sequelize, tableName: "event_notification_reads", timestamps: true, underscored: true, indexes: [{ unique: true, fields: ["event_id", "user_id"] }] },
);
