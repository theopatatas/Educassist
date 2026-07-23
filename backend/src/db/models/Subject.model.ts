import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Subject extends Model {
  declare id: number;
  declare name: string;
  declare code: string | null;
  declare createdByAdmin: boolean;
}

Subject.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    createdByAdmin: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      field: "created_by_admin",
    },
  },
  {
    sequelize,
    tableName: "subjects",
    timestamps: true,
    underscored: true,
  },
);
