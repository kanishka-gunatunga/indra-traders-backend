import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { Secret } from "jsonwebtoken";
import http from "http-status-codes";
import db from "../models";

const { ServiceBookingAuth, Branch } = db;

const generateToken = (payload: any) => {
    const secret = process.env.JWT_SECRET as Secret;
    if (!secret) throw new Error("JWT_SECRET is not defined");

    return jwt.sign(payload, secret, {
        expiresIn: "1d"
    });
};

export const serviceBookingLogin = async (req: Request, res: Response) => {
    try {
        const { username, password, branch_id } = req.body;
        console.log(`[Login Attempt] Username: ${username}, BranchId: ${branch_id}`);

        if (!username || !password || !branch_id) {
            console.log("[Login Failed] Missing required fields");
            return res.status(http.BAD_REQUEST).json({
                message: "Username, password and branch_id are required"
            });
        }

        const numericBranchId = Number(branch_id);
        if (isNaN(numericBranchId)) {
            console.log(`[Login Failed] Invalid branch_id: ${branch_id}`);
            return res.status(http.BAD_REQUEST).json({
                message: "Invalid branch_id"
            });
        }

        const auth = await ServiceBookingAuth.findOne({
            where: {
                username,
                // branch_id: Number(branch_id)
                branch_id: numericBranchId
            },
            include: [{
                model: Branch, as: "branch", attributes: ['name']
            }]
        });

        if (!auth) {
            console.log(`[Login Failed] User not found or branch mismatch: ${username} for branch ${branch_id}`);
            return res.status(http.UNAUTHORIZED).json({
                message: "Invalid credentials or branch"
            });
        }

        const isMatch = await bcrypt.compare(password, auth.password);

        if (!isMatch) {
            console.log(`[Login Failed] Password mismatch for user: ${username}`);
            return res.status(http.UNAUTHORIZED).json({
                message: "Invalid credentials"
            });
        }

        console.log(`[Login Success] User: ${username}, Branch: ${(auth as any).branch?.name}`);

        const accessToken = generateToken({
            id: auth.id,
            branch_id: auth.branch_id,
            type: 'service-booking'
        });

        res.json({
            accessToken,
            user: {
                id: auth.id,
                username: auth.username,
                branch_id: auth.branch_id,
                branch_name: (auth as any).branch?.name
            }
        });
    } catch (error: any) {
        console.error("Login Error: ", error);

        res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error", error: error.message
        });
    }

};