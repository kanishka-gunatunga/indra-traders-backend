import { Server, Socket } from "socket.io";
import db from "../models";

type AgentPresence = {
    userId: number;
    socketId: string;
    currentAssigned: number; // active assigned chats
};

const onlineAgents = new Map<number, AgentPresence>(); // userId -> presence
const chatRoom = (chatId: string) => `chat:${chatId}`;

async function markUserOnline(userId: number, socketId: string) {
    onlineAgents.set(userId, { userId, socketId, currentAssigned: await countAssigned(userId) });
}

async function markUserOffline(userId: number) {
    onlineAgents.delete(userId);
}

async function countAssigned(userId: number) {
    return db.ChatSession.count({ where: { agent_id: userId, status: "assigned" } });
}

/** Picks an available agent with the least load */
function pickAgent(): AgentPresence | null {
    if (onlineAgents.size === 0) return null;
    const all = [...onlineAgents.values()];
    all.sort((a, b) => a.currentAssigned - b.currentAssigned);
    return all[0] || null;
}

/** Assign next queued chat by priority (desc) then time (asc) */
async function assignNextQueued(io: Server) {
    const next = await db.ChatSession.findOne({
        where: { status: "queued" },
        order: [
            ["priority", "DESC"],
            ["createdAt", "ASC"],
        ],
    });
    if (!next) return;

    const agent = pickAgent();
    if (!agent) return;

    await next.update({ status: "assigned", agent_id: agent.userId });
    const presence = onlineAgents.get(agent.userId);
    if (presence) presence.currentAssigned += 1;

    // notify both
    io.to(presence!.socketId).emit("chat.assigned", {
        chat_id: next.chat_id,
    });
    io.to(chatRoom(next.chat_id)).emit("agent.joined", {
        agent_id: agent.userId,
    });
}

export default function initSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        /**
         * Client connects with:
         *   role: "customer" | "agent"
         *   chat_id?: for customers existing session
         *   user_id?: for agents
         */
        const { role, chat_id, user_id } = socket.handshake.query as any;

        // Join chat room if provided
        if (chat_id) socket.join(chatRoom(String(chat_id)));

        // Agent presence
        if (role === "agent" && user_id) {
            const uid = Number(user_id);
            markUserOnline(uid, socket.id).then(() => {
                io.to(socket.id).emit("presence.confirmed");
                assignNextQueued(io); // try to auto-assign pending chats on login
            });
        }

        // Typing indicators
        socket.on("typing", ({ chat_id, by }: { chat_id: string; by: "customer" | "agent" }) => {
            socket.to(chatRoom(chat_id)).emit("typing", { by });
        });
        socket.on("stop_typing", ({ chat_id, by }: { chat_id: string; by: "customer" | "agent" }) => {
            socket.to(chatRoom(chat_id)).emit("stop_typing", { by });
        });

        // Customer sends message
        socket.on("message.customer", async ({ chat_id, text }: { chat_id: string; text: string }) => {
            await db.ChatMessage.create({ chat_id, sender: "customer", message: text, viewed_by_agent: "no" });
            await db.ChatSession.update(
                { last_message_at: new Date(), unread_count: db.sequelize.literal("unread_count + 1") as any },
                { where: { chat_id } }
            );
            io.to(chatRoom(chat_id)).emit("message.new", { chat_id, sender: "customer", text });
        });

        // Agent sends message
        socket.on("message.agent", async ({ chat_id, text, user_id }: { chat_id: string; text: string; user_id: number }) => {
            await db.ChatMessage.create({ chat_id, sender: "agent", message: text, viewed_by_agent: "yes" });
            await db.ChatSession.update(
                { last_message_at: new Date(), unread_count: 0 },
                { where: { chat_id } }
            );
            io.to(chatRoom(chat_id)).emit("message.new", { chat_id, sender: "agent", text });
        });

        // Customer requests live agent
        socket.on("request.agent", async ({ chat_id, priority = 0, channel }: any) => {
            const session = await db.ChatSession.findOne({ where: { chat_id } });
            if (!session) return;

            await session.update({ status: "queued", priority, channel: channel || session.channel });
            io.emit("queue.updated"); // ping agents UI
            await assignNextQueued(io);
        });

        // Agent accepts a specific queued chat manually
        socket.on("agent.accept", async ({ chat_id, user_id }: { chat_id: string; user_id: number }) => {
            const session = await db.ChatSession.findOne({ where: { chat_id } });
            if (!session || session.status === "closed") return;

            await session.update({ status: "assigned", agent_id: user_id });
            const presence = onlineAgents.get(user_id);
            if (presence) presence.currentAssigned += 1;

            io.to(chatRoom(chat_id)).emit("agent.joined", { agent_id: user_id });
            io.emit("queue.updated");
        });

        // Close chat
        socket.on("chat.close", async ({ chat_id }: { chat_id: string }) => {
            const session = await db.ChatSession.findOne({ where: { chat_id } });
            if (!session) return;
            await session.update({ status: "closed" });
            if (session.agent_id) {
                const presence = onlineAgents.get(session.agent_id);
                if (presence && presence.currentAssigned > 0) presence.currentAssigned -= 1;
            }
            io.to(chatRoom(chat_id)).emit("chat.closed");
            await assignNextQueued(io); // free slot -> assign another queued chat
        });

        socket.on("disconnect", () => {
            if (role === "agent" && user_id) {
                markUserOffline(Number(user_id));
            }
        });
    });
}
