import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface UnavailableVehicleSaleAttributes {
    id: number;
    date: Date;
    call_agent_id: number;
    vehicle_make: string;
    vehicle_model: string;
    manufacture_year: number;
    transmission: "AUTO" | "MANUAL";
    fuel_type: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
    down_payment: number;
    price_from: number;
    price_to: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type UnavailableVehicleSaleCreationAttributes = Optional<
    UnavailableVehicleSaleAttributes,
    "id" | "date"
>;

export class UnavailableVehicleSale
    extends Model<UnavailableVehicleSaleAttributes, UnavailableVehicleSaleCreationAttributes>
    implements UnavailableVehicleSaleAttributes {
    public id!: number;
    public date!: Date;
    public call_agent_id!: number;
    public vehicle_make!: string;
    public vehicle_model!: string;
    public manufacture_year!: number;
    public transmission!: "AUTO" | "MANUAL";
    public fuel_type!: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
    public down_payment!: number;
    public price_from!: number;
    public price_to!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    UnavailableVehicleSale.init(
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
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
            },
            price_from: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
            },
            price_to: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: "unavailable_vehicle_sales",
            timestamps: true,
        }
    );

    return UnavailableVehicleSale;
};