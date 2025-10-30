import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export type SparePartSaleStatus = "NEW" | "ONGOING" | "WON" | "LOST";

export interface SparePartSaleAttributes {
    id: number;
    ticket_number: string;
    date: Date;
    status: SparePartSaleStatus;
    customer_id: string;
    call_agent_id: number;
    assigned_sales_id?: number | null;
    vehicle_make?: string | null;
    vehicle_model?: string | null;
    part_no?: string | null;
    year_of_manufacture?: number | null;
    additional_note?: string | null;
    priority: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type SparePartSaleCreationAttributes = Optional<SparePartSaleAttributes, "id" | "status" | "assigned_sales_id" | "ticket_number" | "priority">;

class SparePartSale extends Model<SparePartSaleAttributes, SparePartSaleCreationAttributes> implements SparePartSaleAttributes {
    public id!: number;
    public ticket_number!: string;
    public date!: Date;
    public status!: SparePartSaleStatus;
    public customer_id!: string;
    public call_agent_id!: number;
    public assigned_sales_id!: number | null;
    public vehicle_make!: string | null;
    public vehicle_model!: string | null;
    public part_no!: string | null;
    public year_of_manufacture!: number | null;
    public additional_note!: string | null;
    public priority!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    SparePartSale.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            ticket_number: {
                type: DataTypes.STRING(100),
                allowNull: false,
                // unique: true
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM("NEW", "ONGOING", "WON", "LOST"),
                allowNull: false,
                defaultValue: "NEW"
            },
            customer_id: {
                type: DataTypes.STRING,
                allowNull: false
            },
            call_agent_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false
            },
            assigned_sales_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true
            },
            vehicle_make: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            vehicle_model: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            part_no: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            year_of_manufacture: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            additional_note: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            priority: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0
            }
        },
        {
            sequelize,
            tableName: "spare_part_sales",
            timestamps: true,
            indexes: [{fields: ["ticket_number"]}, {fields: ["status"]}, {fields: ["assigned_sales_id"]}],
        }
    );
    return SparePartSale;
};
