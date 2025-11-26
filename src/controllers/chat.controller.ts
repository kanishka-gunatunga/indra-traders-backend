import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";
import {Op} from "sequelize";
import {EmailService} from "../services/email";

function newChatId() {
    return "INDRA-" + Math.floor(100000 + Math.random() * 900000);
}

export const startChat = async (req: Request, res: Response) => {
    try {
        const {
            language = 'en',
            channel,
            user_type = 'guest',
            name,
            mobile
        } = req.body;
        const chat_id = newChatId();

        const session = await db.ChatSession.create({
            chat_id,
            status: "bot",
            channel: channel || "Web",
            language: language,
            user_type: user_type,
            customer_name: name || null,
            customer_contact: mobile || null,
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

// export const listQueue = async (req: Request, res: Response) => {
//     try {
//         // We assume the frontend sends the current user's ID in query or we get it from auth middleware
//         // For this example, let's assume you pass ?agent_id=123 or handle it via middleware
//         const {agent_id} = req.query;
//
//         let languageFilter = {};
//
//         if (agent_id) {
//             const agent = await db.User.findByPk(agent_id);
//             if (agent && agent.languages) {
//                 // Filter queue to only show chats matching agent's languages
//                 languageFilter = {
//                     language: {[Op.in]: agent.languages}
//                 };
//             }
//         }
//
//         const rows = await db.ChatSession.findAll({
//             where: {
//                 status: "queued",
//                 ...languageFilter // Apply filter
//             },
//             order: [
//                 ["priority", "DESC"],
//                 ["createdAt", "ASC"],
//             ],
//         });
//         return res.status(http.OK).json(rows);
//     } catch (e) {
//         console.error("listQueue", e);
//         return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//     }
// };

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
            include: [{
                model: db.ChatSession,
                as: 'session',
                attributes: ['status', 'language']
            }]
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

// export const rateAgent = async (req: Request, res: Response) => {
//     try {
//         const {chat_id} = req.params;
//         const {rating, message} = req.body;
//
//         if (!rating || rating < 1 || rating > 5) {
//             return res.status(http.BAD_REQUEST).json({message: "Invalid rating"});
//         }
//
//         const session = await db.ChatSession.findOne({where: {chat_id}});
//         if (!session) return res.status(http.NOT_FOUND).json({message: "Chat not found"});
//
//         await session.update({
//             agent_rating: rating,
//             rating_message: message || null
//         });
//
//         return res.status(http.OK).json({message: "Thank you for your feedback!"});
//     } catch (e) {
//         console.error("rateAgent", e);
//         return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//     }
// };

export const rateAgent = async (req: Request, res: Response) => {
    try {
        const {chat_id} = req.params;
        const {rating, message} = req.body;

        // Validate input
        if (!rating && !message) {
            return res.status(400).json({error: "Rating or message required"});
        }

        const session = await db.ChatSession.findOne({where: {chat_id}});

        if (!session) {
            return res.status(404).json({error: "Chat session not found"});
        }

        // Update the session with rating data
        await session.update({
            agent_rating: rating || null,
            rating_message: message || null
        });

        return res.status(200).json({success: true, message: "Rating submitted"});
    } catch (error) {
        console.error("Error submitting rating:", error);
        return res.status(500).json({error: "Internal Server Error"});
    }
};

export const uploadAttachment = (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({message: "No file uploaded"});
        }

        const fileUrl = `/uploads/${req.file.filename}`;

        return res.status(200).json({
            url: fileUrl,
            filename: req.file.originalname,
            mimetype: req.file.mimetype
        });
    } catch (e) {
        console.error("Upload Error", e);
        return res.status(500).json({message: "Upload failed"});
    }
};


export const getRatedSessions = async (req: Request, res: Response) => {
    try {
        const sessions = await db.ChatSession.findAll({
            where: {
                agent_rating: {
                    [Op.ne]: null as any
                }
            },
            include: [
                {
                    model: db.User,
                    as: 'agent',
                    attributes: ['id', 'full_name', 'email'] // Only fetch necessary agent fields
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        return res.status(http.OK).json(sessions);
    } catch (e) {
        console.error("getRatedSessions", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error fetching ratings"});
    }
};

export const getAgentSessions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const {count, rows} = await db.ChatSession.findAndCountAll({
            where: {
                agent_id: {
                    [Op.ne]: null as any // Filter for sessions where an agent was ever assigned
                }
            },
            include: [
                {
                    model: db.User,
                    as: 'agent',
                    attributes: ['id', 'full_name', 'email']
                }
            ],
            order: [['updatedAt', 'DESC']],
            limit: limit,
            offset: offset
        });

        return res.status(http.OK).json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            sessions: rows
        });
    } catch (e) {
        console.error("getAgentSessions", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error fetching agent sessions"});
    }
};


export const getSessionHistory = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const filter = req.query.filter as string || 'all'; // 'agent', 'bot', 'all'
        const offset = (page - 1) * limit;

        const whereClause: any = {};

        if (filter === 'agent') {
            whereClause.agent_id = {[Op.ne]: null};
        } else if (filter === 'bot') {
            whereClause.agent_id = {[Op.eq]: null};
        }

        const {count, rows} = await db.ChatSession.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: db.User,
                    as: 'agent',
                    attributes: ['id', 'full_name', 'email']
                }
            ],
            order: [['updatedAt', 'DESC']],
            limit: limit,
            offset: offset
        });

        return res.status(http.OK).json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            sessions: rows
        });
    } catch (e) {
        console.error("getSessionHistory", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error fetching session history"});
    }
};


export const verifyCustomer = async (req: Request, res: Response) => {
    try {
        const {phone_number} = req.body;

        if (!phone_number) {
            return res.status(http.BAD_REQUEST).json({message: "Phone number is required"});
        }

        const customer = await db.Customer.findOne({where: {phone_number}});

        if (!customer) {
            return res.status(http.NOT_FOUND).json({
                message: "This number is not registered in our system. Please continue as a Guest or contact support."
            });
        }

        if (!customer.email) {
            return res.status(http.BAD_REQUEST).json({
                message: "No email address linked to this phone number. Please contact support."
            });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await db.Otp.create({
            phone_number,
            otp_code: otpCode,
            expires_at: expiresAt
        });

        const emailSent = await EmailService.sendOtpEmail(customer.email, otpCode, customer.customer_name);

        if (!emailSent) {
            return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Failed to send email. Please try again."});
        }

        // Mask email for security in response (e.g., j***@gmail.com)
        const maskedEmail = customer.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

        return res.status(http.OK).json({
            success: true,
            message: "OTP sent",
            email: maskedEmail,
            customer_name: customer.customer_name
        });

    } catch (e) {
        console.error("verifyCustomer error:", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error during verification"});
    }
};


export const validateOtp = async (req: Request, res: Response) => {
    try {
        const {phone_number, otp} = req.body;

        const record = await db.Otp.findOne({
            where: {phone_number, otp_code: otp},
            order: [['createdAt', 'DESC']]
        });

        if (!record) {
            return res.status(http.BAD_REQUEST).json({message: "Invalid OTP"});
        }

        if (new Date() > record.expires_at) {
            return res.status(http.BAD_REQUEST).json({message: "OTP has expired"});
        }

        await record.destroy();

        return res.status(http.OK).json({success: true, message: "Verification successful"});

    } catch (e) {
        console.error("validateOtp error:", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error validating OTP"});
    }
};