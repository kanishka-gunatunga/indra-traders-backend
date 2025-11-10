// import { DataTypes, Model, Optional, Sequelize } from "sequelize";
//
// interface ChatSessionAttr {
//     id: number;
//     chat_id: string;
//     status: "bot" | "queued" | "assigned" | "closed";
//     agent_id: number | null;
// }
//
// interface ChatSessionCreate extends Optional<ChatSessionAttr, "id"> {}
//
// class ChatSession extends Model<ChatSessionAttr, ChatSessionCreate> {}
//
// export default (sequelize: Sequelize) => {
//     ChatSession.init(
//         {
//             id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
//             chat_id: {type: DataTypes.STRING, allowNull: false},
//             status: {
//                 type: DataTypes.ENUM("bot", "queued", "assigned", "closed"),
//                 defaultValue: "bot"
//             },
//
//             agent_id: {
//                 type: DataTypes.INTEGER,
//                 allowNull: true,
//                 references: {
//                     model: "users",
//                     key: "id"
//                 }
//             }
//         },
//         {
//             sequelize,
//             tableName: "chat_sessions"
//         }
//
//     );
//
//     return ChatSession;
//
// }

import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface ChatSessionAttr {
    id: number;
    chat_id: string; // unique key for a conversation
    status: "bot" | "queued" | "assigned" | "closed";
    agent_id: number | null; // FK -> users.id
    priority: number;        // higher = more urgent
    channel?: "Web" | "WhatsApp" | "Facebook" | "Other" | null;
    last_message_at?: Date | null;
    unread_count?: number;
    agent_rating?: number;
    rating_message?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ChatSessionCreate extends Optional<ChatSessionAttr, "id" | "status" | "agent_id" | "priority" | "channel" | "last_message_at" | "unread_count" | "agent_rating" | "rating_message"> {
}

export class ChatSession extends Model<ChatSessionAttr, ChatSessionCreate> implements ChatSessionAttr {
    public id!: number;
    public chat_id!: string;
    public status!: "bot" | "queued" | "assigned" | "closed";
    public agent_id!: number | null;
    public priority!: number;
    public channel?: ChatSessionAttr["channel"];
    public last_message_at?: Date | null;
    public unread_count?: number;
    public agent_rating?: number;
    public rating_message?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    ChatSession.init(
        {
            id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
            chat_id: {type: DataTypes.STRING(64), allowNull: false, unique: true},
            status: {
                type: DataTypes.ENUM("bot", "queued", "assigned", "closed"),
                allowNull: false,
                defaultValue: "bot",
            },
            agent_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
                references: {model: "users", key: "id"},
            },
            priority: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
            channel: {type: DataTypes.ENUM("Web", "WhatsApp", "Facebook", "Other")},
            last_message_at: {type: DataTypes.DATE, allowNull: true},
            unread_count: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0},
            agent_rating: { type: DataTypes.INTEGER, allowNull: true },
            rating_message: { type: DataTypes.TEXT, allowNull: true },
        },
        {sequelize, tableName: "chat_sessions", timestamps: true}
    );
    return ChatSession;
};

