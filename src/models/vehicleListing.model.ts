import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface VehicleAttributes {
    id: number;
    vehicle_no: string;
    make: string;
    model: string;
    type: string;
    grade: string;
    manufacture_year: number;
    mileage: number;
    no_of_owners: number;
    price: number;
    color: string;
    capacity: string;
    fuel_type: "PETROL" | "DIESEL" | "ELECTRIC" | "HYBRID";
    transmission: "MANUAL" | "AUTO";
    createdAt?: Date;
    updatedAt?: Date;
}

export interface VehicleCreationAttributes extends Optional<VehicleAttributes, "id" | "createdAt" | "updatedAt"> {
}

export class Vehicle extends Model<VehicleAttributes, VehicleCreationAttributes> implements VehicleAttributes {
    public id!: number;
    public vehicle_no!: string;
    public make!: string;
    public model!: string;
    public type!: string;
    public grade!: string;
    public manufacture_year!: number;
    public mileage!: number;
    public no_of_owners!: number;
    public price!: number;
    public color!: string;
    public capacity!: string;
    public fuel_type!: "PETROL" | "DIESEL" | "ELECTRIC" | "HYBRID";
    public transmission!: "MANUAL" | "AUTO";
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    Vehicle.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            vehicle_no: {
                type: DataTypes.STRING(50),
                allowNull: false,
                // unique: true,
            },
            make: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            model: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            type: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            grade: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            manufacture_year: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            mileage: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            no_of_owners: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            price: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
            },
            color: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            capacity: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            fuel_type: {
                type: DataTypes.ENUM("PETROL", "DIESEL", "ELECTRIC", "HYBRID"),
                allowNull: false,
            },
            transmission: {
                type: DataTypes.ENUM("MANUAL", "AUTO"),
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: "vehicles",
            timestamps: true,
        }
    );

    return Vehicle;
};