import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Grade extends Model {
  declare id: number;
  declare gradeItemId: number;
  declare studentId: number;
  declare score: number;
}

Grade.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    gradeItemId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "grade_item_id",
      references: { model: "grade_items", key: "id" },
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
    score: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "grades",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["grade_item_id", "student_id"], unique: true }],
  }
);
