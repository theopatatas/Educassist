import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Teacher extends Model {
  declare id: number;
  declare userId: number;
  declare firstName: string;
  declare lastName: string;
  declare employeeNumber: string | null;
  declare sectionId: number | null;
  declare gradeLevel: string | null;
}

Teacher.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true,
      field: "user_id",
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "first_name",
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "last_name",
    },
    employeeNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "employee_number",
    },
    sectionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "section_id",
      references: { model: "sections", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    gradeLevel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "grade_level",
    },
  },
  {
    sequelize,
    tableName: "teachers",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"], unique: true }],
  }
);
