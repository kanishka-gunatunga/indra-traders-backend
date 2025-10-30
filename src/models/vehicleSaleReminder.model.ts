import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface ReminderAttributes {
    id: number;
    task_title: string;
    task_date: Date;
    note?: string | null;
    vehicleSaleId: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type ReminderCreationAttributes = Optional<ReminderAttributes, "id" | "note" | "createdAt" | "updatedAt">;

class Reminder extends Model<ReminderAttributes, ReminderCreationAttributes>
    implements ReminderAttributes {
    public id!: number;
    public task_title!: string;
    public task_date!: Date;
    public note!: string | null;
    public vehicleSaleId!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    Reminder.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            task_title: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            task_date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            note: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            vehicleSaleId: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: {model: "vehicle_sales", key: "id"},
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        },
        {
            sequelize,
            tableName: "vehicle_sale_reminders",
            timestamps: true,
        }
    );

    return Reminder;
};
