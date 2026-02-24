import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Outcome extends Model {
  declare id: number;
  declare subjectId: number | null;
  declare code: string | null;
  declare description: string;
}

Outcome.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    subjectId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "subject_id",
      references: { model: "subjects", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    code: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "outcomes",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["subject_id"] }],
  }
);
