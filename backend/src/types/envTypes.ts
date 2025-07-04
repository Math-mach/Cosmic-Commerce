export interface IConfig {
    NODE_ENV: "development" | "production";
    PORT: number;
    SECRET_KEY: string;
    DATABASE_URL: string;
}
