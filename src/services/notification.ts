// import db from "../models";
//
// const {Notification} = db;
//
// interface NotifyData {
//     userId: number;
//     title: string;
//     message: string;
//     type: "REMINDER" | "ASSIGNMENT" | "SYSTEM" | "ALERT";
//     referenceId?: number;
//     referenceModule?: string;
// }
//
// export const sendNotification = async (data: NotifyData) => {
//
//     Promise.resolve().then(async () => {
//         try {
//             await Notification.create({
//                 user_id: data.userId,
//                 title: data.title,
//                 message: data.message,
//                 type: data.type,
//                 reference_id: data.referenceId,
//                 reference_module: data.referenceModule
//             });
//         } catch (error) {
//             console.error("Failed to send notification:", error);
//         }
//     });
// };

import db from "../models";
import {io} from "../server";
import {userRoom} from "../realtime/notificationSocket";

interface NotifyData {
    userId: number;
    title: string;
    message: string;
    type: "REMINDER" | "ASSIGNMENT" | "SYSTEM" | "ALERT";
    referenceId?: number;
    referenceModule?: string;
}

export async function sendNotification(data: NotifyData) {
    const notification = await db.Notification.create({
        user_id: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        reference_id: data.referenceId,
        reference_module: data.referenceModule
    });

    io.to(userRoom(data.userId)).emit("notification.new", {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        is_read: false,
        created_at: notification.created_at
    });

    return notification;
}
