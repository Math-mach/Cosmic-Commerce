import knex from "knex";
import configKnex from "../knexfile";
import config from "../config";

export default knex(configKnex[config.NODE_ENV || "development"]);
