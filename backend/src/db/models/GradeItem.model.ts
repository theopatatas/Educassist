import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class GradeItem extends Model {
  declare id: number;
  declare classId: number;
  declare name: string;
  declare weight: number;
  declare maxScore: number;
  declare dueDate: string | null;
}

GradeItem.init(
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
    name: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 1.0,
    },
    maxScore: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      field: "max_score",
      defaultValue: 100,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "due_date",
    },
  },
  {
    sequelize,
    tableName: "grade_items",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["class_id"] }],
  }
);
