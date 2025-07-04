export interface IConfig {
    NODE_ENV: "development" | "production";
    PORT: number;
    JWT_SECRET: string;
    DATABASE_URL: string;
}
