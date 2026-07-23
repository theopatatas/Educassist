"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const env_1 = require("./env");
const databaseName = env_1.env.NODE_ENV === "test" ? env_1.env.DB_NAME_TEST : env_1.env.DB_NAME;
exports.sequelize = new sequelize_1.Sequelize(databaseName, env_1.env.DB_USER, env_1.env.DB_PASS, {
    host: env_1.env.DB_HOST,
    port: env_1.env.DB_PORT,
    dialect: "mysql",
    logging: env_1.env.NODE_ENV === "development" ? console.log : false,
});
