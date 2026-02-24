import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Assignment extends Model {
  declare id: number;
  declare teacherId: number;
  declare classId: number | null;
  declare title: string;
  declare dueDate: string;
  declare status: string;
  declare description: string | null;
}

Assignment.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    teacherId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "teacher_id",
      references: { model: "teachers", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    classId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "class_id",
      references: { model: "classes", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "due_date",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Active",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "assignments",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["teacher_id"] }, { fields: ["class_id"] }],
  }
);

