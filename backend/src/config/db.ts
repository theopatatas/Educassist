import { Sequelize } from "sequelize";
import { env } from "./env";

const databaseName = env.NODE_ENV === "test" ? env.DB_NAME_TEST! : env.DB_NAME;

export const sequelize = new Sequelize(databaseName, env.DB_USER, env.DB_PASS, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: "mysql",
  logging: env.NODE_ENV === "development" ? console.log : false,
});
