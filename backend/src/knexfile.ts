import { Knex } from "knex";

import config from "./config";

const DB_HOST = config.NODE_ENV !== "development" ? "db" : "localhost";

const DATABASE_URL = `postgres://${config.DB_USER}:${config.DB_PASSWORD}@${DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`;

const configKnex: { [key: string]: Knex.Config } = {
    development: {
        client: "pg",
        connection: DATABASE_URL,
    },
    production: {
        client: "pg",
        connection: DATABASE_URL,
    },
};

export default configKnex;
