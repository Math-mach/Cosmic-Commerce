import dotenv from "dotenv";
dotenv.config();

import { IConfig } from "../types/envTypes";

function getEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

const config: IConfig = {
    NODE_ENV: getEnvVar("NODE_ENV") as "development",
    PORT: Number(getEnvVar("PORT")),
    JWT_SECRET: getEnvVar("JWT_SECRET"),
    DB_USER: getEnvVar("DB_USER"),
    DB_PASSWORD: getEnvVar("DB_PASSWORD"),
    DB_PORT: Number(getEnvVar("DB_PORT")),
    DB_NAME: getEnvVar("DB_NAME"),
};

export default config;
