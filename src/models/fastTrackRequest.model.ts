import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface DirectRequestAttributes {
    id: number;
    customer_id: string;
    vehicle_type: string;
    vehicle_make: string;
    vehicle_model: string;
    grade: string;
    manufacture_year: number;
    mileage_min: number;
    mileage_max: number;
    no_of_owners: number;
    price_from: number;
    price_to: number;
    call_agent_id: number;
    status: "PENDING" | "ASSIGNED" | "COMPLETED";
    createdAt?: Date;
    updatedAt?: Date;
}

export interface DirectRequestCreationAttributes extends Optional<DirectRequestAttributes, "id" | "createdAt" | "updatedAt"> {
}

export class DirectRequest extends Model<DirectRequestAttributes, DirectRequestCreationAttributes> implements DirectRequestAttributes {
    public id!: number;
    public customer_id!: string;
    public vehicle_type!: string;
    public vehicle_make!: string;
    public vehicle_model!: string;
    public grade!: string;
    public manufacture_year!: number;
    public mileage_min!: number;
    public mileage_max!: number;
    public no_of_owners!: number;
    public price_from!: number;
    public price_to!: number;
    public call_agent_id!: number;
    public status!: "PENDING" | "ASSIGNED" | "COMPLETED";
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    DirectRequest.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            customer_id: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            vehicle_type: {
                type: DataTypes.STRING(50),
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
            grade: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            manufacture_year: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            mileage_min: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            mileage_max: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            no_of_owners: {
                type: DataTypes.INTEGER,
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
            call_agent_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM("PENDING", "ASSIGNED", "COMPLETED"),
                allowNull: false,
                defaultValue: "PENDING",
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
            tableName: "fast_track_direct_requests",
            timestamps: true,
        }
    );

    return DirectRequest;
};