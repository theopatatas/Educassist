import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class SchoolEvent extends Model {
  declare id: number;
  declare title: string;
  declare category: string;
  declare description: string | null;
  declare eventDate: string;
  declare endDate: string | null;
  declare startTime: string | null;
  declare endTime: string | null;
  declare location: string | null;
  declare targetAudience: string;
  declare status: string;
  declare createdBy: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

SchoolEvent.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    category: { type: DataTypes.STRING(60), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    eventDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "event_date",
    },
    endDate: { type: DataTypes.DATEONLY, allowNull: true, field: "end_date" },
    startTime: { type: DataTypes.TIME, allowNull: true, field: "start_time" },
    endTime: { type: DataTypes.TIME, allowNull: true, field: "end_time" },
    location: { type: DataTypes.STRING(200), allowNull: true },
    targetAudience: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: "target_audience",
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Scheduled",
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "created_by",
      references: { model: "users", key: "id" },
    },
  },
  {
    sequelize,
    tableName: "school_events",
    timestamps: true,
    underscored: true,
  },
);
