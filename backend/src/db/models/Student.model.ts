import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Student extends Model {
  declare id: number;
  declare userId: number;
  declare lrn: string;
  declare studentMobileNumber: string | null;
  declare firstName: string;
  declare lastName: string;
  declare middleName: string | null;
  declare birthDate: Date | null;
  declare gender: string | null;
  declare guardianContact: string | null;
  declare guardianName: string | null;
  declare motherName: string | null;
  declare fatherName: string | null;
  declare yearLevel: string | null;
  declare sectionId: number | null;
  declare previousGradeLevel: string | null;
  declare promotedAt: Date | null;
  declare graduatedAt: Date | null;
  declare archivedAt: Date | null;
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
    studentMobileNumber: {
      type: DataTypes.STRING(11),
      allowNull: true,
      field: "student_mobile_number",
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
    guardianName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "guardian_name",
    },
    motherName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "mother_name",
    },
    fatherName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "father_name",
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
    previousGradeLevel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "previous_grade_level",
    },
    promotedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "promoted_at",
    },
    graduatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "graduated_at",
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "archived_at",
    },
  },
  {
    sequelize,
    tableName: "students",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["user_id"], unique: true }],
  },
);
