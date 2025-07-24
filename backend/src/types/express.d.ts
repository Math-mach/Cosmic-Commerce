import { UUID } from "crypto";

declare global {
    namespace Express {
        export interface Request {
            user?: {
                id: UUID;
                email: string;
            };
        }
    }
}
