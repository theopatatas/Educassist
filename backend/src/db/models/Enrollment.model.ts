import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Enrollment extends Model {
  declare id: number;
  declare classId: number;
  declare studentId: number;
  declare enrolledAt: Date | null;
}

Enrollment.init(
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
    enrolledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "enrolled_at",
    },
  },
  {
    sequelize,
    tableName: "enrollments",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["class_id", "student_id"], unique: true }],
  }
);
