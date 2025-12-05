import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface ServiceParkSaleReminderAttributes {
    id: number;
    task_title: string;
    task_date: Date;
    note?: string | null;
    service_park_sale_id: number;
    created_by?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type ServiceParkSaleReminderCreationAttributes = Optional<ServiceParkSaleReminderAttributes, "id" | "note" | "createdAt" | "updatedAt" | "created_by">;

class ServiceParkSaleReminder extends Model<ServiceParkSaleReminderAttributes, ServiceParkSaleReminderCreationAttributes> implements ServiceParkSaleReminderAttributes {
    public id!: number;
    public task_title!: string;
    public task_date!: Date;
    public note!: string | null;
    public service_park_sale_id!: number;
    public created_by!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    ServiceParkSaleReminder.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            task_title: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            task_date: {
                type: DataTypes.DATE,
                allowNull: false
            },
            note: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            service_park_sale_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: {model: "spare_part_sales", key: "id"},
                onDelete: "CASCADE",
                onUpdate: "CASCADE"
            },
            created_by: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
                references: {model: "users", key: "id"}
            }
        },
        {
            sequelize,
            tableName: "service_park_sale_reminders",
            timestamps: true,
        }
    );
    return ServiceParkSaleReminder;
};
