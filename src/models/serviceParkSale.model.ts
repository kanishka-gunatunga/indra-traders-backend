import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface AssignToSalesAttributes {
    id: number;
    ticket_number: string;
    date: Date;
    customer_id: string;
    vehicle_id: number;
    sales_user_id?: number | null;
    current_level: 1 | 2 | 3;
    branch: string;
    service_category: string;
    vehicle_make: string;
    vehicle_model: string;
    year_of_manufacture: number;
    additional_note?: string;
    lead_source?: string;
    status: "NEW" | "ONGOING" | "WON" | "LOST";
    priority: number;
}

export type AssignToSalesCreationAttributes = Optional<
    AssignToSalesAttributes,
    "id" | "sales_user_id" | "status" | "current_level"
>;

export default (sequelize: Sequelize) => {
    class AssignToSales
        extends Model<AssignToSalesAttributes, AssignToSalesCreationAttributes>
        implements AssignToSalesAttributes {
        public id!: number;
        public ticket_number!: string;
        public date!: Date;
        public customer_id!: string;
        public vehicle_id!: number;
        public sales_user_id?: number | null;
        public current_level!: 1 | 2 | 3;
        public branch!: string;
        public service_category!: string;
        public vehicle_make!: string;
        public vehicle_model!: string;
        public year_of_manufacture!: number;
        public additional_note?: string;
        public lead_source?: string;
        public status!: "NEW" | "ONGOING" | "WON" | "LOST";
        public priority!: number;
    }

    AssignToSales.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            ticket_number: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false
            },
            customer_id: {
                type: DataTypes.STRING,
                allowNull: false
            },
            vehicle_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false
            },
            sales_user_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true
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
            service_category: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            vehicle_make: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            vehicle_model: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            year_of_manufacture: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            additional_note: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            lead_source: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            status: {
                type: DataTypes.ENUM("NEW", "ONGOING", "WON", "LOST"),
                defaultValue: "NEW",
                allowNull: false,
            },
            priority: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
        },
        {
            sequelize,
            tableName: "service_park_sale",
            timestamps: true,
        }
    );

    return AssignToSales;
};
