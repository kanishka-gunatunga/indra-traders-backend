import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface VehicleHistoryAttributes {
    id: number;
    vehicle_no: string;
    vehicle_model?: string; 
    vehicle_make?: string;
    odometer: number;
    owner_name: string;
    contact_no: string;
    email?: string;
    address?: string;
    mileage?: number;
    oil_type?: string;
    service_center?: string;
    service_advisor?: string;
    customer_id: string;
    created_by?: number;
}

export type VehicleHistoryCreationAttributes = Optional<
    VehicleHistoryAttributes,
    "id" | "created_by"
>;

export default (sequelize: Sequelize) => {
    class VehicleHistory
        extends Model<VehicleHistoryAttributes, VehicleHistoryCreationAttributes>
        implements VehicleHistoryAttributes {
        public id!: number;
        public vehicle_no!: string;
        public vehicle_model?: string;
        public vehicle_make?: string;
        public odometer!: number;
        public owner_name!: string;
        public contact_no!: string;
        public email?: string;
        public address?: string;
        public mileage?: number;
        public oil_type?: string;
        public service_center?: string;
        public service_advisor?: string;
        public customer_id!: string;
        public created_by?: number;
    }

    VehicleHistory.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            vehicle_no: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },
            vehicle_model: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            vehicle_make: {
                type: DataTypes.STRING(50),
                allowNull: true
            },
            odometer: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            owner_name: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            contact_no: {
                type: DataTypes.STRING(30),
                allowNull: false
            },
            email: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            address: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            mileage: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            oil_type: {
                type: DataTypes.STRING(50),
                allowNull: true
            },
            service_center: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            service_advisor: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            customer_id: {
                type: DataTypes.STRING,
                allowNull: false
            },
            created_by: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true
            },
        },
        {
            sequelize,
            tableName: "vehicle_histories",
            timestamps: true,
        }
    );

    return VehicleHistory;
};
