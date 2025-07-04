import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import { UUID } from "crypto";

interface JwtPayload {
    id: UUID;
    email: string;
}

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;

    if (!token) {
        return res
            .status(401)
            .json({ message: "Acesso negado. Nenhum token fornecido." });
    }

    try {
        const decoded = jwt.verify(
            token,
            config.JWT_SECRET as string
        ) as JwtPayload;

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(403).json({ message: "Token inválido ou expirado." });
    }
};

module.exports = { isAuthenticated };
