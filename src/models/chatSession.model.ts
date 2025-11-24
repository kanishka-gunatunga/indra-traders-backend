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
    language: "en" | "si" | "ta";
    last_message_at?: Date | null;
    unread_count?: number;
    agent_rating?: number;
    rating_message?: string;
    user_type: 'guest' | 'registered';
    customer_name?: string | null;
    customer_contact?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ChatSessionCreate extends Optional<ChatSessionAttr, "id" | "status" | "agent_id" | "priority" | "channel" | "language" | "last_message_at" | "unread_count" | "agent_rating" | "rating_message" | "user_type" | "customer_name" | "customer_contact"> {
}

export class ChatSession extends Model<ChatSessionAttr, ChatSessionCreate> implements ChatSessionAttr {
    public id!: number;
    public chat_id!: string;
    public status!: "bot" | "queued" | "assigned" | "closed";
    public agent_id!: number | null;
    public priority!: number;
    public channel?: ChatSessionAttr["channel"];
    public language!: ChatSessionAttr["language"];
    public last_message_at?: Date | null;
    public unread_count?: number;
    public agent_rating?: number;
    public rating_message?: string;
    public user_type!: "guest" | "registered";
    public customer_name?: string | null;
    public customer_contact?: string | null;
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
            language: {type: DataTypes.ENUM("en", "si", "ta"), allowNull: false, defaultValue: "en"},
            channel: {type: DataTypes.ENUM("Web", "WhatsApp", "Facebook", "Other")},

            user_type: {type: DataTypes.ENUM("guest", "registered"), defaultValue: "guest"},
            customer_name: {type: DataTypes.STRING, allowNull: true},
            customer_contact: {type: DataTypes.STRING, allowNull: true},

            last_message_at: {type: DataTypes.DATE, allowNull: true},
            unread_count: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0},
            agent_rating: {type: DataTypes.INTEGER, allowNull: true},
            rating_message: {type: DataTypes.TEXT, allowNull: true},
        },
        {sequelize, tableName: "chat_sessions", timestamps: true, charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci'}
    );
    return ChatSession;
};

