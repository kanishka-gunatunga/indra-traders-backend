import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface BydSaleFollowupAttributes {
    id: number;
    activity: string;
    activity_date: Date;
    bydSaleId: number;
    created_by?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type BydSaleFollowupCreationAttributes = Optional<BydSaleFollowupAttributes, "id" | "createdAt" | "updatedAt" | "created_by">;

class BydSaleFollowup extends Model<BydSaleFollowupAttributes, BydSaleFollowupCreationAttributes>
    implements BydSaleFollowupAttributes {
    public id!: number;
    public activity!: string;
    public activity_date!: Date;
    public bydSaleId!: number;
    public created_by!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    BydSaleFollowup.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            activity: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            activity_date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            bydSaleId: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: { model: "byd_sales", key: "id" },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            created_by: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
                references: { model: "users", key: "id" }
            }
        },
        {
            sequelize,
            tableName: "byd_sale_followups",
            timestamps: true,
        }
    );

    return BydSaleFollowup;
};
