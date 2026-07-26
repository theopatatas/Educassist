import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class EventNotificationRead extends Model {
  declare id: number;
  declare eventId: number;
  declare userId: number;
  declare dismissedAt: Date | null;
}

EventNotificationRead.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    eventId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "event_id", references: { model: "school_events", key: "id" }, onDelete: "CASCADE" },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id", references: { model: "users", key: "id" }, onDelete: "CASCADE" },
    dismissedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "dismissed_at",
    },
  },
  { sequelize, tableName: "event_notification_reads", timestamps: true, underscored: true, indexes: [{ unique: true, fields: ["event_id", "user_id"] }] },
);
