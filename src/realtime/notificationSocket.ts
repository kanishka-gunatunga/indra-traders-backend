import { Server, Socket } from "socket.io";

export const userRoom = (userId: number) => `user:${userId}`;

export default function initNotificationSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        const { userId } = socket.handshake.query;

        if (userId) {
            socket.join(userRoom(Number(userId)));
            console.log(`🔔 User ${userId} joined notification room`);
        }

        socket.on("disconnect", () => {
            if (userId) {
                console.log(`🔕 User ${userId} left notification room`);
            }
        });
    });
}