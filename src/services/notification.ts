import db from "../models";

const { Notification } = db;

interface NotifyData {
    userId: number;
    title: string;
    message: string;
    type: "REMINDER" | "ASSIGNMENT" | "SYSTEM" | "ALERT";
    referenceId?: number;
    referenceModule?: string;
}

export const sendNotification = async (data: NotifyData) => {
    try {
        await Notification.create({
            user_id: data.userId,
            title: data.title,
            message: data.message,
            type: data.type,
            reference_id: data.referenceId,
            reference_module: data.referenceModule
        });
    } catch (error) {
        console.error("Failed to send notification:", error);
    }
};