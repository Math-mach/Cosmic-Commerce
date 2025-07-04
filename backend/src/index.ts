import express, { Express } from "express";
import cookieParser from "cookie-parser";

import config from "./config";

const PORT: number = Number(config.PORT) || 3000;
const app: Express = express();

app.use(cookieParser());
app.use(express.json());

const Routes = require("./routes");
app.use("/api/", Routes);

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
