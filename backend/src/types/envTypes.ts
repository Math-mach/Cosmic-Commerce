export interface IConfig {
    NODE_ENV: "development" | "production";
    PORT: number;
    JWT_SECRET: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_PORT: number;
    DB_NAME: string;
}
