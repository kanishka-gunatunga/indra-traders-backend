import {Request, Response} from "express";
import bcrypt from 'bcryptjs'
import jwt, {Secret} from "jsonwebtoken";
import http from 'http-status-codes';
import dotenv from "dotenv";
import db from "../models";
import {Op} from "sequelize";

dotenv.config();

const {
    User,
    VehicleSale,
    VehicleSaleHistory,
    FastTrackSale,
    FastTrackSaleHistory,
    SparePartSale,
    SparePartSaleHistory,
    ServiceParkSale,
    ServiceParkSaleHistory
} = db;

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        role: string;
    };
}

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


const getDepartmentConfig = (department: string) => {
    switch (department) {
        case "ITPL": // Vehicle Sales
            return {
                model: VehicleSale,
                historyModel: VehicleSaleHistory,
                fk: "assigned_sales_id",
                historyFk: "vehicle_sale_id"
            };
        case "ISP": // Spare Parts
            return {
                model: SparePartSale,
                historyModel: SparePartSaleHistory,
                fk: "assigned_sales_id",
                historyFk: "spare_part_sale_id"
            };
        case "IFT": // Fast Track
            return {
                model: FastTrackSale,
                historyModel: FastTrackSaleHistory,
                fk: "assigned_sales_id",
                historyFk: "fast_track_sale_id"
            };
        case "IMS": // Service Park
            return {
                model: ServiceParkSale,
                historyModel: ServiceParkSaleHistory,
                fk: "sales_user_id", // Note: Service park uses different column name
                historyFk: "service_park_sale_id"
            };
        default:
            return null;
    }
};


export const createUser = async (req: Request, res: Response) => {
    try {
        const {
            full_name,
            contact_no,
            email,
            user_role,
            department,
            branch,
            password,
            confirm_password,
            languages
        } = req.body;

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

// export const updateUser = async (req: Request, res: Response) => {
//     try {
//         const {id} = req.params;
//         const user = await User.findByPk(id);
//         if (!user) return res.status(http.NOT_FOUND).json({message: "User not found"});
//
//         await user.update(req.body);
//         res.json({message: "User updated successfully", user});
//     } catch (error) {
//         res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error updating user", error});
//     }
// };


export const checkUserHandoverRequirements = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const user = await User.findByPk(id);

        if (!user) return res.status(http.NOT_FOUND).json({message: "User not found"});

        // If user is not sales/call agent, usually no leads to check, but let's be safe based on department
        const config = getDepartmentConfig(user.department);

        let activeLeadsCount = 0;

        if (config) {
            activeLeadsCount = await (config.model as any).count({
                where: {
                    [config.fk]: user.id,
                    status: "ONGOING" // Only care about active/ongoing leads
                }
            }) as number;
        }

        // Find potential replacements (Same Branch, Same Department, Same Role)
        // Exclude the user being updated
        const replacements = await User.findAll({
            where: {
                branch: user.branch,
                department: user.department,
                user_role: user.user_role,
                id: {[Op.ne]: user.id}
            },
            attributes: ['id', 'full_name', 'email']
        });

        res.status(http.OK).json({
            activeLeadsCount,
            replacements,
            needsHandover: activeLeadsCount > 0
        });

    } catch (error: any) {
        console.error("Check Handover Error:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error checking requirements", error: error.message});
    }
};


export const updateUser = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();

    try {
        const {id} = req.params;
        const {transferToUserId, ...updateData} = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(http.NOT_FOUND).json({message: "User not found"});

        const isRoleChange = updateData.user_role && updateData.user_role !== user.user_role;
        const isDeptChange = updateData.department && updateData.department !== user.department;
        const isBranchChange = updateData.branch && updateData.branch !== user.branch;

        const config = getDepartmentConfig(user.department);

        if ((isRoleChange || isDeptChange || isBranchChange) && config) {
            const activeLeads = await (config.model as any).findAll({
                where: {
                    [config.fk]: user.id,
                    status: "ONGOING"
                }
            });

            if (activeLeads.length > 0) {
                if (!transferToUserId) {
                    await t.rollback();
                    return res.status(http.CONFLICT).json({
                        message: "User has active leads. Please select a replacement user to transfer leads."
                    });
                }

                const replacementUser = await User.findByPk(transferToUserId);
                if (!replacementUser) {
                    await t.rollback();
                    return res.status(http.BAD_REQUEST).json({message: "Replacement user not found"});
                }

                await (config.model as any).update(
                    {[config.fk]: transferToUserId},
                    {
                        where: {
                            [config.fk]: user.id,
                            status: "ONGOING"
                        },
                        transaction: t
                    }
                );

                const adminId = (req as AuthenticatedRequest).user?.id || 1;

                const historyRecords = activeLeads.map((lead: any) => ({
                    [config.historyFk]: lead.id,
                    action_by: adminId,
                    action_type: "ADMIN_REASSIGN",
                    previous_level: lead.current_level,
                    new_level: lead.current_level,
                    details: `Lead reassigned from ${user.full_name} to ${replacementUser.full_name} due to role/department change.`,
                    timestamp: new Date()
                }));


                if (historyRecords.length > 0) {
                    await (config.historyModel as any).bulkCreate(historyRecords, {transaction: t});
                }


            }
        }

        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        await user.update(updateData, {transaction: t});

        await t.commit();
        res.json({message: "User updated and leads transferred successfully", user});
    } catch (error) {
        await t.rollback();
        console.error("Error updating user:", error);

        const errorMessage = (error as any).message || "Unknown error";

        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error updating user", error: errorMessage});
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
