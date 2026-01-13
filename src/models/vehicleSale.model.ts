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
    branch: string;
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

    enable_leasing: boolean;
    leasing_vehicle_price?: number | null;
    leasing_bank?: string | null;
    leasing_time_period?: number | null;
    leasing_promo_code?: string | null;
    leasing_interest_rate?: number | null;
    leasing_monthly_installment?: number | null;
    leasing_total_amount?: number | null;
}

export type VehicleSaleCreationAttributes = Optional<
    VehicleSaleAttributes,
    "id" | "status" | "assigned_sales_id" | "additional_note" | "priority" | "current_level" |
    "enable_leasing" | "leasing_vehicle_price" | "leasing_bank" | "leasing_time_period" |
    "leasing_promo_code" | "leasing_interest_rate" | "leasing_monthly_installment" | "leasing_total_amount"
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
    public branch!: string;
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

    public enable_leasing!: boolean;
    public leasing_vehicle_price!: number | null;
    public leasing_bank!: string | null;
    public leasing_time_period!: number | null;
    public leasing_promo_code!: string | null;
    public leasing_interest_rate!: number | null;
    public leasing_monthly_installment!: number | null;
    public leasing_total_amount!: number | null;
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
                validate: {isIn: [[1, 2, 3]]}
            },
            branch: {
                type: DataTypes.STRING(100),
                allowNull: false,
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
            },

            enable_leasing: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            leasing_vehicle_price: {
                type: DataTypes.FLOAT,
                allowNull: true,
            },
            leasing_bank: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            leasing_time_period: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            leasing_promo_code: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            leasing_interest_rate: {
                type: DataTypes.FLOAT,
                allowNull: true,
            },
            leasing_monthly_installment: {
                type: DataTypes.FLOAT,
                allowNull: true,
            },
            leasing_total_amount: {
                type: DataTypes.FLOAT,
                allowNull: true,
            }
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
