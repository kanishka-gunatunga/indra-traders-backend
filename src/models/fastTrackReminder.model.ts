import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface ReminderAttributes {
    id: number;
    sale_id?: number | null;
    direct_request_id?: number | null;
    task_title: string;
    task_date: Date;
    note?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ReminderCreationAttributes extends Optional<ReminderAttributes, "id" | "createdAt" | "updatedAt"> {
}

export class Reminder extends Model<ReminderAttributes, ReminderCreationAttributes> implements ReminderAttributes {
    public id!: number;
    public sale_id!: number | null;
    public direct_request_id!: number | null;
    public task_title!: string;
    public task_date!: Date;
    public note!: string | null;
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
            sale_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            },
            direct_request_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            },
            task_title: {
                type: DataTypes.STRING(100),
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
            tableName: "fast_track_reminders",
            timestamps: true,
        }
    );

    return Reminder;
};