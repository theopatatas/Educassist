import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

export class AdaptiveTrace extends Model {
  declare id: number;
  declare studentId: number;
  declare outcomeId: number | null;
  declare masteryBefore: number;
  declare masteryAfter: number;
  declare delta: number;
  declare difficulty: number;
  declare metadataJson: string | null;
}

AdaptiveTrace.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "student_id",
      references: { model: "students", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    outcomeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "outcome_id",
      references: { model: "outcomes", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    masteryBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "mastery_before",
      defaultValue: 0,
    },
    masteryAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "mastery_after",
      defaultValue: 0,
    },
    delta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    difficulty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    metadataJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "metadata_json",
    },
  },
  {
    sequelize,
    tableName: "adaptive_traces",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["student_id"] }],
  }
);
