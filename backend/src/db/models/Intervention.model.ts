import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Intervention extends Model {
  declare id: number;
  declare studentId: number;
  declare teacherId: number;
  declare note: string;
}

Intervention.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "student_id",
      references: { model: "students", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    teacherId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "teacher_id",
      references: { model: "teachers", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "interventions",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["student_id"] }],
  }
);
