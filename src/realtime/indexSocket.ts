import { Server } from "socket.io";
import initChatSocket from "./socket";
import initNotificationSocket from "./notificationSocket";

export default function initSocket(io: Server) {
    initChatSocket(io);
    initNotificationSocket(io);
}