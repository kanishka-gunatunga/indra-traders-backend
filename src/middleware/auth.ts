import { Request, Response, NextFunction } from "express";
import jwt, { Secret } from "jsonwebtoken";
import http from "http-status-codes";

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        role: string;
    };
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(http.UNAUTHORIZED).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(http.UNAUTHORIZED).json({ message: "No token provided" });
    }

    try {
        const secret = process.env.JWT_SECRET as Secret;
        const decoded = jwt.verify(token, secret) as { id: number; role: string };
        (req as AuthenticatedRequest).user = decoded;
        next();
    } catch (error) {
        return res.status(http.UNAUTHORIZED).json({ message: "Invalid token" });
    }
};
