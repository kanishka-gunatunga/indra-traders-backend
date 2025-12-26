import {Request, Response} from "express";
import http from "http-status-codes";
import db from "../models";
import {Op} from "sequelize";

const {ActivityLog, User} = db;

export const getActivityLogs = async (req: Request, res: Response) => {
    try {
        const {startDate, endDate, module, userRole, userId} = req.query;

        const whereClause: any = {};

        if (startDate && endDate) {
            whereClause.created_at = {
                [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
            };
        }

        if (module) whereClause.module = module;
        if (userRole) whereClause.user_role = userRole;
        if (userId) whereClause.user_id = userId;

        const logs = await ActivityLog.findAll({
            where: whereClause,
            include: [
                {model: User, as: 'user', attributes: ['id', 'full_name', 'email']}
            ],
            order: [['created_at', 'DESC']],
            limit: 100
        });

        res.status(http.OK).json(logs);
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error fetching logs"});
    }
};