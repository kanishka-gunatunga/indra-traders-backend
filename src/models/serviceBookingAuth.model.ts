import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface ServiceBookingAuthAttributes {
    id: number;
    branch_id: number;
    username: string;
    password: string;
    is_active?: boolean;
}

export interface ServiceBookingAuthCreationAttributes extends Optional<ServiceBookingAuthAttributes, "id" | "is_active"> {
}

class ServiceBookingAuth extends Model<ServiceBookingAuthAttributes, ServiceBookingAuthCreationAttributes> implements ServiceBookingAuthAttributes {
    public id!: number;
    public branch_id!: number;
    public username!: string;
    public password!: string;
    public is_active!: boolean;
}

export default (sequelize: Sequelize) => {
    ServiceBookingAuth.init({
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        branch_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },{
        sequelize,
        tableName: "service_booking_auths",
        timestamps: true
    });

    return ServiceBookingAuth;
};