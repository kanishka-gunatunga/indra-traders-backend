import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface ReminderAttributes {
    id: number;
    task_title: string;
    task_date: Date;
    note?: string | null;
    complaintId: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type ReminderCreationAttributes = Optional<ReminderAttributes, "id" | "note" | "createdAt" | "updatedAt">;

class ComplaintReminder extends Model<ReminderAttributes, ReminderCreationAttributes>
    implements ReminderAttributes {
    public id!: number;
    public task_title!: string;
    public task_date!: Date;
    public note!: string | null;
    public complaintId!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    ComplaintReminder.init(
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
            complaintId: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: {model: "complaints", key: "id"},
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        },
        {
            sequelize,
            tableName: "complaint_reminders",
            timestamps: true,
        }
    );

    return ComplaintReminder;
};
