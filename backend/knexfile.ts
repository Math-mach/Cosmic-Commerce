import { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config();

const config: { [key: string]: Knex.Config } = {
    development: {
        client: "pg",
        connection: process.env.DATABASE_URL,
    },
    production: {
        client: "pg",
        connection: process.env.DATABASE_URL,
    },
};

export default config;
