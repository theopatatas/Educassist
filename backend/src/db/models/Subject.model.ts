import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Subject extends Model {
  declare id: number;
  declare name: string;
  declare code: string | null;
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
  },
  {
    sequelize,
    tableName: "subjects",
    timestamps: true,
    underscored: true,
  }
);
