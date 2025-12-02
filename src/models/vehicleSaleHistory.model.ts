import { DataTypes, Model, Sequelize } from "sequelize";

interface VehicleSaleHistoryAttributes {
    id: number;
    vehicle_sale_id: number;
    action_by: number;
    action_type: "CREATED" | "ASSIGNED" | "STATUS_CHANGE" | "PROMOTED_LEVEL";
    previous_level?: number;
    new_level?: number;
    details: string;
    timestamp: Date;
}

class VehicleSaleHistory extends Model<VehicleSaleHistoryAttributes> implements VehicleSaleHistoryAttributes {
    public id!: number;
    public vehicle_sale_id!: number;
    public action_by!: number;
    public action_type!: "CREATED" | "ASSIGNED" | "STATUS_CHANGE" | "PROMOTED_LEVEL";
    public previous_level!: number;
    public new_level!: number;
    public details!: string;
    public timestamp!: Date;
}

export default (sequelize: Sequelize) => {
    VehicleSaleHistory.init(
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            vehicle_sale_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
            action_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
            action_type: { type: DataTypes.STRING, allowNull: false },
            previous_level: { type: DataTypes.INTEGER, allowNull: true },
            new_level: { type: DataTypes.INTEGER, allowNull: true },
            details: { type: DataTypes.STRING, allowNull: false },
            timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        },
        { sequelize, tableName: "vehicle_sale_histories", timestamps: false }
    );
    return VehicleSaleHistory;
};