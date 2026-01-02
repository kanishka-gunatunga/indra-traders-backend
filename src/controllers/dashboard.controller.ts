import { Request, Response } from "express";
import http from "http-status-codes";
import * as DashboardService from "../services/dashboard";

export const getDashboardMetrics = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, sbu, branch, salesUserId } = req.query;

        const data = await DashboardService.getDashboardData({
            startDate: startDate as string,
            endDate: endDate as string,
            sbu: sbu as any,
            branch: branch as string,
            salesUserId: salesUserId ? Number(salesUserId) : undefined
        });

        res.status(http.OK).json(data);
    } catch (error: any) {
        console.error("Dashboard Error:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching dashboard metrics",
            error: error.message
        });
    }
};