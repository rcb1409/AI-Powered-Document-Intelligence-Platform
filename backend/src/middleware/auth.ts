import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService";

export interface AuthenticatedRequest extends Request {
    userId?: number;
}

export function authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try{
        const header = req.headers.authorization;

        if(!header || !header.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, error: "Missing token" });
        }
        const token = header.split(" ")[1];
        const payload = verifyToken(token);
        req.userId = payload.userId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: "Invalid token" });
    }
}