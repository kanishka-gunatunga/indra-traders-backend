// import { DataTypes, Model, Sequelize } from "sequelize";
//
// interface ActivityLogAttributes {
//     id: number;
//     user_id: number;
//     user_role: string;
//     department: string;
//     module: "VEHICLE" | "SPARE_PARTS" | "FAST_TRACK" | "SERVICE_PARK" | "USER_MGMT";
//     action_type: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "STATUS_CHANGE";
//     entity_id: number;
//     description: string;
//     changes: object;
//     created_at?: Date;
// }
//
// class ActivityLog extends Model<ActivityLogAttributes> implements ActivityLogAttributes {
//     public id!: number;
//     public user_id!: number;
//     public user_role!: string;
//     public department!: string;
//     public module!: "VEHICLE" | "SPARE_PARTS" | "FAST_TRACK" | "SERVICE_PARK" | "USER_MGMT";
//     public action_type!: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "STATUS_CHANGE";
//     public entity_id!: number;
//     public description!: string;
//     public changes!: object;
//     public readonly created_at!: Date;
// }
//
// export default (sequelize: Sequelize) => {
//     ActivityLog.init({
//         id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
//         user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
//         user_role: { type: DataTypes.STRING, allowNull: false },
//         department: { type: DataTypes.STRING, allowNull: true },
//         module: { type: DataTypes.STRING, allowNull: false },
//         action_type: { type: DataTypes.STRING, allowNull: false },
//         entity_id: { type: DataTypes.INTEGER, allowNull: false },
//         description: { type: DataTypes.STRING, allowNull: false },
//         changes: { type: DataTypes.JSON, allowNull: true },
//     }, {
//         sequelize,
//         tableName: "activity_logs",
//         timestamps: true,
//         updatedAt: false,
//         createdAt: 'created_at'
//     });
//     return ActivityLog;
// };



import { DataTypes, Model, Sequelize, Optional } from "sequelize";


interface ActivityLogAttributes {
    id: number;
    user_id: number;
    user_role: string;
    department: string;
    module: "VEHICLE" | "SPARE_PARTS" | "FAST_TRACK" | "SERVICE_PARK" | "USER_MGMT" | "BYD_SALES";
    action_type: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "STATUS_CHANGE";
    entity_id: number;
    description: string;
    changes: object | null;
    created_at?: Date;
}

interface ActivityLogCreationAttributes extends Optional<ActivityLogAttributes, "id" | "created_at"> { }

class ActivityLog extends Model<ActivityLogAttributes, ActivityLogCreationAttributes> implements ActivityLogAttributes {
    public id!: number;
    public user_id!: number;
    public user_role!: string;
    public department!: string;
    public module!: "VEHICLE" | "SPARE_PARTS" | "FAST_TRACK" | "SERVICE_PARK" | "USER_MGMT" | "BYD_SALES";
    public action_type!: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "STATUS_CHANGE";
    public entity_id!: number;
    public description!: string;
    public changes!: object;
    public readonly created_at!: Date;
}

export default (sequelize: Sequelize) => {
    ActivityLog.init({
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        user_role: { type: DataTypes.STRING, allowNull: false },
        department: { type: DataTypes.STRING, allowNull: true },
        module: { type: DataTypes.STRING, allowNull: false },
        action_type: { type: DataTypes.STRING, allowNull: false },
        entity_id: { type: DataTypes.INTEGER, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: false },
        changes: { type: DataTypes.JSON, allowNull: true },
    }, {
        sequelize,
        tableName: "activity_logs",
        timestamps: true,
        updatedAt: false,
        createdAt: 'created_at'
    });
    return ActivityLog;
};