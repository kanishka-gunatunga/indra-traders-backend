// import {DataTypes, Model, Optional, Sequelize} from "sequelize";
//
// interface ChatMsgAttr {
//     id: number;
//     chat_id: string;
//     sender: "customer" | "bot" | "agent";
//     message: string;
//     viewed_by_agent: "yes" | "no";
// }
//
// class ChatMessage extends Model<ChatMsgAttr> {
// }
//
// export default (sequelize: Sequelize) => {
//     ChatMessage.init(
//         {
//             id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
//             chat_id: {type: DataTypes.STRING},
//             sender: {
//                 type: DataTypes.ENUM("customer", "bot", "agent"),
//                 allowNull: false,
//             },
//             message: {type: DataTypes.TEXT, allowNull: false},
//             viewed_by_agent: {
//                 type: DataTypes.ENUM("yes", "no"),
//                 defaultValue: "no",
//             },
//         },
//         {sequelize, tableName: "chat_messages"}
//     );
//
//     return ChatMessage;
//
// }

// import {DataTypes, Model, Sequelize} from "sequelize";
//
// export interface ChatMsgAttr {
//     id: number;
//     chat_id: string;
//     sender: "customer" | "bot" | "agent";
//     message: string;
//     viewed_by_agent: "yes" | "no";
//     createdAt?: Date;
//     updatedAt?: Date;
// }
//
// export class ChatMessage extends Model<ChatMsgAttr> implements ChatMsgAttr {
//     public id!: number;
//     public chat_id!: string;
//     public sender!: "customer" | "bot" | "agent";
//     public message!: string;
//     public viewed_by_agent!: "yes" | "no";
//     public readonly createdAt!: Date;
//     public readonly updatedAt!: Date;
// }
//
// export default (sequelize: Sequelize) => {
//     ChatMessage.init(
//         {
//             id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
//             chat_id: {type: DataTypes.STRING(64), allowNull: false},
//             sender: {type: DataTypes.ENUM("customer", "bot", "agent"), allowNull: false},
//             message: {type: DataTypes.TEXT, allowNull: false},
//             viewed_by_agent: {type: DataTypes.ENUM("yes", "no"), defaultValue: "no"},
//         },
//         {
//             sequelize,
//             tableName: "chat_messages",
//             indexes: [{fields: ["chat_id"]}],
//             timestamps: true,
//         }
//     );
//     return ChatMessage;
// };

import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface ChatMsgAttr {
    id: number;
    chat_id: string;
    sender: "customer" | "bot" | "agent";
    message: string;
    viewed_by_agent: "yes" | "no";
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ChatMsgCreateAttr extends Optional<ChatMsgAttr, "id" | "createdAt" | "updatedAt"> {}

export class ChatMessage extends Model<ChatMsgAttr, ChatMsgCreateAttr> implements ChatMsgAttr {
    public id!: number;
    public chat_id!: string;
    public sender!: "customer" | "bot" | "agent";
    public message!: string;
    public viewed_by_agent!: "yes" | "no";
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    ChatMessage.init(
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            chat_id: { type: DataTypes.STRING, allowNull: false },
            sender: { type: DataTypes.ENUM("customer", "bot", "agent"), allowNull: false },
            message: { type: DataTypes.TEXT, allowNull: false },
            viewed_by_agent: { type: DataTypes.ENUM("yes", "no"), defaultValue: "no" },
        },
        {
            sequelize,
            tableName: "chat_messages",
            timestamps: true,
        }
    );

    return ChatMessage;
};



