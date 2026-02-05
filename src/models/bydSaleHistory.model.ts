import { DataTypes, Model, Sequelize } from "sequelize";

interface BydSaleHistoryAttributes {
    id: number;
    byd_sale_id: number;
    action_by: number;
    action_type: "CREATED" | "ASSIGNED" | "STATUS_CHANGE" | "PROMOTED_LEVEL" | "CREATE" | "UPDATE" | "DELETE";
    previous_level?: number;
    new_level?: number;
    details: string;
    timestamp: Date;
}

class BydSaleHistory extends Model<BydSaleHistoryAttributes> implements BydSaleHistoryAttributes {
    public id!: number;
    public byd_sale_id!: number;
    public action_by!: number;
    public action_type!: "CREATED" | "ASSIGNED" | "STATUS_CHANGE" | "PROMOTED_LEVEL" | "CREATE" | "UPDATE" | "DELETE";
    public previous_level!: number;
    public new_level!: number;
    public details!: string;
    public timestamp!: Date;
}

export default (sequelize: Sequelize) => {
    BydSaleHistory.init(
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            byd_sale_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
            action_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
            action_type: { type: DataTypes.STRING, allowNull: false },
            previous_level: { type: DataTypes.INTEGER, allowNull: true },
            new_level: { type: DataTypes.INTEGER, allowNull: true },
            details: { type: DataTypes.STRING, allowNull: false },
            timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        },
        { sequelize, tableName: "byd_sale_histories", timestamps: false }
    );
    return BydSaleHistory;
};
