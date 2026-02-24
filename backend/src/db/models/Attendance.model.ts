import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Attendance extends Model {
  declare id: number;
  declare classId: number;
  declare studentId: number;
  declare date: string;
  declare status: string;
}

Attendance.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    classId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "class_id",
      references: { model: "classes", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    studentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "student_id",
      references: { model: "students", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "present",
    },
  },
  {
    sequelize,
    tableName: "attendance",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["class_id", "student_id", "date"], unique: true }],
  }
);
