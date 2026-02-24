import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Student extends Model {
  declare id: number;
  declare userId: number;
  declare lrn: string;
  declare firstName: string;
  declare lastName: string;
  declare middleName: string | null;
  declare birthDate: Date | null;
  declare gender: string | null;
  declare guardianContact: string | null;
  declare yearLevel: string | null;
  declare sectionId: number | null;
}

Student.init(
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
    lrn: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
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
    middleName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "middle_name",
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "birth_date",
    },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    guardianContact: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "guardian_contact",
    },
    yearLevel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "year_level",
    },
    sectionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "section_id",
      references: { model: "sections", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
  },
  {
    sequelize,
    tableName: "students",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"], unique: true }],
  }
);
