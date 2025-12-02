import {DataTypes, Model, Optional, Sequelize} from "sequelize";
import db from "../models";
import User from "./user.model";
import Customer from "./customer.model";

// const { sequelize } = db;

export interface VehicleSaleAttributes {
    id: number;
    ticket_number: string;
    date: Date;
    status: "NEW" | "ONGOING" | "WON" | "LOST";
    customer_id: string;
    call_agent_id: number;
    assigned_sales_id?: number | null;
    current_level: 1 | 2 | 3;
    vehicle_make: string;
    vehicle_model: string;
    manufacture_year: number;
    transmission: "AUTO" | "MANUAL";
    fuel_type: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
    down_payment: number;
    price_from: number;
    price_to: number;
    priority: number;
    additional_note?: string | null;
}

export type VehicleSaleCreationAttributes = Optional<
    VehicleSaleAttributes,
    "id" | "status" | "assigned_sales_id" | "additional_note" | "priority" | "current_level"
>;

class VehicleSale
    extends Model<VehicleSaleAttributes, VehicleSaleCreationAttributes>
    implements VehicleSaleAttributes {
    public id!: number;
    public ticket_number!: string;
    public date!: Date;
    public status!: "NEW" | "ONGOING" | "WON" | "LOST";
    public customer_id!: string;
    public call_agent_id!: number;
    public assigned_sales_id!: number | null;
    public current_level!: 1 | 2 | 3;
    public vehicle_make!: string;
    public vehicle_model!: string;
    public manufacture_year!: number;
    public transmission!: "AUTO" | "MANUAL";
    public fuel_type!: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
    public down_payment!: number;
    public price_from!: number;
    public price_to!: number;
    public additional_note!: string | null;
    public priority!: number;
}

export default (sequelize: Sequelize) => {
    VehicleSale.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            ticket_number: {
                type: DataTypes.STRING(50),
                allowNull: false,
                // unique: true,
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM("NEW", "ONGOING", "WON", "LOST"),
                allowNull: false,
                defaultValue: "NEW",
            },
            customer_id: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            call_agent_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
            },
            assigned_sales_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            },
            current_level: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: { isIn: [[1, 2, 3]] }
            },
            vehicle_make: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            vehicle_model: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            manufacture_year: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            transmission: {
                type: DataTypes.ENUM("AUTO", "MANUAL"),
                allowNull: false,
            },
            fuel_type: {
                type: DataTypes.ENUM("PETROL", "DIESEL", "HYBRID", "ELECTRIC"),
                allowNull: false,
            },
            down_payment: {
                type: DataTypes.FLOAT,
                allowNull: false,
            },
            price_from: {
                type: DataTypes.FLOAT,
                allowNull: false,
            },
            price_to: {
                type: DataTypes.FLOAT,
                allowNull: false,
            },
            additional_note: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            priority: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0
            }
            // sales_level: {
            //     type: DataTypes.INTEGER,
            //     allowNull: false,
            //     defaultValue: 1,
            // }
        },
        {
            sequelize,
            tableName: "vehicle_sales",
            timestamps: true,
        }
    );

    return VehicleSale;

}

// export default VehicleSale;
