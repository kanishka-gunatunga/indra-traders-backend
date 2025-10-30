import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import http from "http-status-codes";

export default (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(http.BAD_REQUEST).json({ errors: errors.array() });
    }
    next();
};