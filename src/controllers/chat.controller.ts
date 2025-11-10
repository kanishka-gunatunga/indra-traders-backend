import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";
import {Op} from "sequelize";

function newChatId() {
    return "INDRA-" + Math.floor(100000 + Math.random() * 900000);
}

export const startChat = async (req: Request, res: Response) => {
    try {
        const {language, channel} = req.body;
        const chat_id = newChatId();

        const session = await db.ChatSession.create({
            chat_id,
            status: "bot",
            channel: channel || "Web",
            last_message_at: new Date(),
            unread_count: 0,
        });

        return res.status(http.CREATED).json(session);
    } catch (e) {
        console.error("startChat", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const requestAgent = async (req: Request, res: Response) => {
    try {
        const {chat_id} = req.params;
        const {priority = 0} = req.body;

        const session = await db.ChatSession.findOne({where: {chat_id}});
        if (!session) return res.status(http.NOT_FOUND).json({message: "Chat not found"});
        if (session.status === "closed") return res.status(http.BAD_REQUEST).json({message: "Chat closed"});

        await session.update({status: "queued", priority});

        return res.status(http.OK).json({message: "Queued", chat_id});
    } catch (e) {
        console.error("requestAgent", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** Agents list queued chats (for dashboards) */
export const listQueue = async (req: Request, res: Response) => {
    try {
        const rows = await db.ChatSession.findAll({
            where: {status: "queued"},
            order: [
                ["priority", "DESC"],
                ["createdAt", "ASC"],
            ],
        });
        return res.status(http.OK).json(rows);
    } catch (e) {
        console.error("listQueue", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** Agent claims a chat manually (alternative to socket 'agent.accept') */
export const assignChat = async (req: Request, res: Response) => {
    try {
        const {chat_id} = req.params;
        const {user_id} = req.body;

        const user = await db.User.findByPk(user_id);
        if (!user) return res.status(http.NOT_FOUND).json({message: "User not found"});

        const session = await db.ChatSession.findOne({where: {chat_id}});
        if (!session) return res.status(http.NOT_FOUND).json({message: "Chat not found"});
        if (session.status === "closed") return res.status(http.BAD_REQUEST).json({message: "Chat closed"});

        await session.update({status: "assigned", agent_id: user_id});

        return res.status(http.OK).json(session);
    } catch (e) {
        console.error("assignChat", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** Close a chat (either side) */
export const closeChat = async (req: Request, res: Response) => {
    try {
        const {chat_id} = req.params;
        const session = await db.ChatSession.findOne({where: {chat_id}});
        if (!session) return res.status(http.NOT_FOUND).json({message: "Chat not found"});

        await session.update({status: "closed"});
        return res.status(http.OK).json({message: "Closed", chat_id});
    } catch (e) {
        console.error("closeChat", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** Fetch messages */
export const getMessages = async (req: Request, res: Response) => {
    try {
        const {chat_id} = req.params;
        const msgs = await db.ChatMessage.findAll({
            where: {chat_id},
            order: [["createdAt", "ASC"]],
        });
        return res.status(http.OK).json(msgs);
    } catch (e) {
        console.error("getMessages", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** Agent's assigned chats (sidebar list) */
export const myAssigned = async (req: Request, res: Response) => {
    try {
        const {user_id} = req.params;
        const rows = await db.ChatSession.findAll({
            where: {agent_id: Number(user_id), status: {[Op.ne]: "closed"}},
            order: [["updatedAt", "DESC"]],
        });
        return res.status(http.OK).json(rows);
    } catch (e) {
        console.error("myAssigned", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const rateAgent = async (req: Request, res: Response) => {
    try {
        const {chat_id} = req.params;
        const {rating, message} = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(http.BAD_REQUEST).json({message: "Invalid rating"});
        }

        const session = await db.ChatSession.findOne({where: {chat_id}});
        if (!session) return res.status(http.NOT_FOUND).json({message: "Chat not found"});

        await session.update({
            agent_rating: rating,
            rating_message: message || null
        });

        return res.status(http.OK).json({message: "Thank you for your feedback!"});
    } catch (e) {
        console.error("rateAgent", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};
