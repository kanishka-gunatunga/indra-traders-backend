import {Request, Response} from "express";
import bcrypt from 'bcryptjs'
import jwt, {Secret} from "jsonwebtoken";
import http from 'http-status-codes';
import dotenv from "dotenv";
import db from "../models";

dotenv.config();

const {User} = db;

interface JwtUserPayload {
    id: number;
    role: string;
}

export const generateToken = (user: JwtUserPayload) => {
    const secret = process.env.JWT_SECRET as Secret;

    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    return jwt.sign({
            id: user.id,
            role: user.role,
        },
        secret,
        {expiresIn: "1d"}
    );
};


export const createUser = async (req: Request, res: Response) => {
    try {
        const {full_name, contact_no, email, user_role, department, branch, password, confirm_password, languages} = req.body;

        if (password !== confirm_password) {
            return res.status(http.BAD_REQUEST).json({message: "Passwords do not match"});
        }

        const existingUser = await User.findOne({where: {email}});
        if (existingUser) {
            return res.status(http.BAD_REQUEST).json({message: "Email already exists"});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userLanguages = Array.isArray(languages) && languages.length > 0 ? languages : ["en"];

        const user = await User.create({
            full_name,
            contact_no,
            email,
            user_role,
            department,
            branch,
            password: hashedPassword,
            languages: userLanguages,
        });

        res.status(http.CREATED).json({message: "User created successfully", user});
    } catch (error: any) {
        console.error("Update User Error:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error updating user",
            error: error.message || "Unknown error"
        });
    }
};


export const login = async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({where: {email}});

        if (!user) {
            return res.status(http.UNAUTHORIZED).json({message: "User not found"});
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(http.UNAUTHORIZED).json({message: "Invalid password"});
        }

        const token = generateToken({
            id: user.id,
            role: user.user_role,
        });
        res.json({user, accessToken: token});
    } catch (err) {
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error logging user", err});
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const {user_role, department, branch} = req.query;

        const where: any = {};
        if (user_role) where.user_role = user_role;
        if (department) where.department = department;
        if (branch) where.branch = branch;

        const users = await User.findAll({where});
        res.json(users);
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error fetching users", error});
    }
};


export const getUserById = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(http.NOT_FOUND).json({message: "User not found"});
        res.json(user);
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error fetching user", error});
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(http.NOT_FOUND).json({message: "User not found"});

        await user.update(req.body);
        res.json({message: "User updated successfully", user});
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error updating user", error});
    }
};


export const deleteUser = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(http.NOT_FOUND).json({message: "User not found"});

        await user.destroy();
        res.json({message: "User deleted successfully"});
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error deleting user", error});
    }
};
