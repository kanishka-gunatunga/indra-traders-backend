// import {DataTypes, Model, Sequelize} from "sequelize";
//
// interface NotificationAttributes {
//     id: number;
//     user_id: number;
//     title: string;
//     message: string;
//     type: "REMINDER" | "ASSIGNMENT" | "SYSTEM" | "ALERT";
//     reference_id?: number;
//     reference_module?: string;
//     is_read: boolean;
//     created_at?: Date;
// }
//
// class Notification extends Model<NotificationAttributes> implements NotificationAttributes {
//     public id!: number;
//     public user_id!: number;
//     public title!: string;
//     public message!: string;
//     public type!: "REMINDER" | "ASSIGNMENT" | "SYSTEM" | "ALERT";
//     public reference_id?: number;
//     public reference_module?: string;
//     public is_read!: boolean;
//     public readonly created_at!: Date;
// }
//
// export default (sequelize: Sequelize) => {
//     Notification.init({
//         id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
//         user_id: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false},
//         title: {type: DataTypes.STRING, allowNull: false},
//         message: {type: DataTypes.TEXT, allowNull: false},
//         type: {type: DataTypes.STRING, defaultValue: "SYSTEM"},
//         reference_id: {type: DataTypes.INTEGER, allowNull: true},
//         reference_module: {type: DataTypes.STRING, allowNull: true},
//         is_read: {type: DataTypes.BOOLEAN, defaultValue: false},
//     }, {
//         sequelize,
//         tableName: "notifications",
//         timestamps: true,
//         updatedAt: false,
//         createdAt: 'created_at'
//     });
//     return Notification;
// };

import {DataTypes, Model, Sequelize, Optional} from "sequelize";

interface NotificationAttributes {
    id: number;
    user_id: number;
    title: string;
    message: string;
    type: "REMINDER" | "ASSIGNMENT" | "SYSTEM" | "ALERT";
    reference_id?: number;
    reference_module?: string;
    is_read: boolean;
    created_at?: Date;
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, "id" | "is_read" | "created_at"> {
}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
    public id!: number;
    public user_id!: number;
    public title!: string;
    public message!: string;
    public type!: "REMINDER" | "ASSIGNMENT" | "SYSTEM" | "ALERT";
    public reference_id?: number;
    public reference_module?: string;
    public is_read!: boolean;
    public readonly created_at!: Date;
}

export default (sequelize: Sequelize) => {
    Notification.init({
        id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
        user_id: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false},
        title: {type: DataTypes.STRING, allowNull: false},
        message: {type: DataTypes.TEXT, allowNull: false},
        type: {type: DataTypes.STRING, defaultValue: "SYSTEM"},
        reference_id: {type: DataTypes.INTEGER, allowNull: true},
        reference_module: {type: DataTypes.STRING, allowNull: true},
        is_read: {type: DataTypes.BOOLEAN, defaultValue: false},
    }, {
        sequelize,
        tableName: "notifications",
        timestamps: true,
        updatedAt: false,
        createdAt: 'created_at'
    });
    return Notification;
};