import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface BydUnavailableSaleAttributes {
    id: number;
    date: Date;
    call_agent_id: number;
    vehicle_model: string;
    manufacture_year: number;
    color: string;
    type: string;
    down_payment: number;
    price_from: number;
    price_to: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type BydUnavailableSaleCreationAttributes = Optional<
    BydUnavailableSaleAttributes,
    "id" | "date"
>;

export class BydUnavailableSale
    extends Model<BydUnavailableSaleAttributes, BydUnavailableSaleCreationAttributes>
    implements BydUnavailableSaleAttributes {
    public id!: number;
    public date!: Date;
    public call_agent_id!: number;
    public vehicle_model!: string;
    public manufacture_year!: number;
    public color!: string;
    public type!: string;
    public down_payment!: number;
    public price_from!: number;
    public price_to!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    BydUnavailableSale.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            call_agent_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
            },
            vehicle_model: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            manufacture_year: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            color: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            type: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            down_payment: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: true,
            },
            price_from: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: true,
            },
            price_to: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: true,
            },
        },
        {
            sequelize,
            tableName: "byd_unavailable_sales",
            timestamps: true,
            charset: "utf8mb4",
            collate: "utf8mb4_general_ci",
        }
    );

    return BydUnavailableSale;
};
