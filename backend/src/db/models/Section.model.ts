import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class Section extends Model {
  declare id: number;
  declare name: string;
  declare schoolYear: string | null;
}

Section.init(
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
    schoolYear: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "school_year",
    },
  },
  {
    sequelize,
    tableName: "sections",
    timestamps: true,
    underscored: true,
  }
);
