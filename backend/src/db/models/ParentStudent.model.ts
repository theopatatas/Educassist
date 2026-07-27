import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class ParentStudent extends Model {
  declare id: number;
  declare parentId: number;
  declare studentId: number;
}

ParentStudent.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    parentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "parent_id",
      references: { model: "parents", key: "id" },
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
  },
  {
    sequelize,
    tableName: "parent_students",
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ["parent_id", "student_id"] },
      { fields: ["student_id"] },
    ],
  },
);
