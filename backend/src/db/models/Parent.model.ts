import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Parent extends Model {
  declare id: number;
  declare userId: number;
  declare firstName: string;
  declare lastName: string;
  declare phone: string | null;
  declare studentId: number | null;
}

Parent.init(
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
    phone: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    studentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "student_id",
      references: { model: "students", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
  },
  {
    sequelize,
    tableName: "parents",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"], unique: true }],
  }
);
