import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface FilterRequestAttributes {
    id: number;
    ticket_number: string;
    call_agent_id: number;
    vehicle_type?: string | null;
    vehicle_make?: string | null;
    vehicle_model?: string | null;
    grade?: string | null;
    manufacture_year?: number | null;
    mileage?: number | null;
    no_of_owners?: number | null;
    price_from?: number | null;
    price_to?: number | null;
    additional_note?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type FilterRequestCreationAttributes = Optional<FilterRequestAttributes, "id" | "ticket_number">;

class FilterRequest extends Model<FilterRequestAttributes, FilterRequestCreationAttributes> implements FilterRequestAttributes {
    public id!: number;
    public ticket_number!: string;
    public call_agent_id!: number;
    public vehicle_type!: string | null;
    public vehicle_make!: string | null;
    public vehicle_model!: string | null;
    public grade!: string | null;
    public manufacture_year!: number | null;
    public mileage!: number | null;
    public no_of_owners!: number | null;
    public price_from!: number | null;
    public price_to!: number | null;
    public additional_note!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    FilterRequest.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            ticket_number: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true
            },
            call_agent_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false
            },
            vehicle_type: {
                type: DataTypes.STRING(50),
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
            grade: {
                type: DataTypes.STRING(50),
                allowNull: true
            },
            manufacture_year: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true
            },
            mileage: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true
            },
            no_of_owners: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true
            },
            price_from: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true
            },
            price_to: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true
            },
            additional_note: {
                type: DataTypes.TEXT,
                allowNull: true
            },
        },
        {
            sequelize,
            tableName: "filter_requests",
            timestamps: true,
            indexes: [{fields: ["call_agent_id"]}, {fields: ["ticket_number"]}],
        }
    );

    return FilterRequest;
};
