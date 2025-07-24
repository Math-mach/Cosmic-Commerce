import { IncomingMessage } from "http";
import { parse } from "cookie";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config";

export interface AuthenticatedUserPayload {
    id: string;
    name: string;
    email: string;
}

export function authenticateWebSocket(
    req: IncomingMessage
): AuthenticatedUserPayload {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
        throw new Error("Autenticação falhou: Nenhum cookie encontrado.");
    }

    const cookies = parse(cookieHeader);
    const token = cookies.token;

    if (!token) {
        throw new Error("Autenticação falhou: Cookie 'token' não encontrado.");
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload &
        AuthenticatedUserPayload;

    return {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
    };
}
