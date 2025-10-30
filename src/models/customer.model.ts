import {
    DataTypes,
    Model,
    Optional,
    Sequelize,
} from "sequelize";
// import db from "./index";

// const {sequelize} = db;

export interface CustomerAttributes {
    id: string;
    customer_name: string;
    phone_number: string;
    whatsapp_number?: string | null;
    email?: string | null;
    vehicle_number?: string | null;
    convenient_branch?: string | null;
    city?: string | null;
    gender?: "MALE" | "FEMALE";
    customer_type?: "INDIVIDUAL" | "COMPANY" | null;
    profession?: string | null;
    lead_source?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type CustomerCreationAttributes = Optional<CustomerAttributes, "id" | "createdAt" | "updatedAt">;

class Customer extends Model<CustomerAttributes, CustomerCreationAttributes> implements CustomerAttributes {
    public id!: string;
    public customer_name!: string;
    public phone_number!: string;
    public whatsapp_number!: string | null;
    public email!: string | null;
    public vehicle_number!: string | null;
    public convenient_branch!: string | null;
    public city!: string | null;
    public gender!: "MALE" | "FEMALE";
    public customer_type!: "INDIVIDUAL" | "COMPANY" | null;
    public profession!: string | null;
    public lead_source!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    Customer.init(
        {
            id: {
                type: DataTypes.STRING,
                primaryKey: true,
            },
            customer_name: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },
            phone_number: {
                type: DataTypes.STRING(30),
                allowNull: false,
                unique: false,
            },
            whatsapp_number: {
                type: DataTypes.STRING(30),
                allowNull: true,
            },
            email: {
                type: DataTypes.STRING(150),
                allowNull: true,
            },
            vehicle_number: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            convenient_branch: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            city: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            gender: {
                type: DataTypes.ENUM("MALE", "FEMALE"),
                allowNull: true,
                defaultValue: "MALE",
            },
            customer_type: {
                type: DataTypes.ENUM("INDIVIDUAL", "COMPANY"),
                allowNull: true,
                defaultValue: "INDIVIDUAL",
            },
            profession: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            lead_source: {
                type: DataTypes.STRING(100),
                allowNull: true,
                defaultValue: "direct call",
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
            tableName: "customers",
            timestamps: true,
        }
    );

    return Customer;
}

// export default Customer;
