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
    DATABASE_URL: getEnvVar("DATABASE_URL"),
};

export default config;
