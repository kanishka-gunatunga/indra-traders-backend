import { Request, Response } from "express";
import http from "http-status-codes";
import db from "../models";

const { Notification } = db;

export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        const notifications = await Notification.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: 50
        });

        const unreadCount = await Notification.count({
            where: { user_id: userId, is_read: false }
        });

        res.status(http.OK).json({ notifications, unreadCount });
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error fetching notifications" });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        await Notification.update(
            { is_read: true },
            { where: { id, user_id: userId } }
        );

        res.status(http.OK).json({ message: "Marked as read" });
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error updating notification" });
    }
};