import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface BydSaleReminderAttributes {
    id: number;
    task_title: string;
    task_date: Date;
    note?: string | null;
    bydSaleId: number;
    created_by?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type BydSaleReminderCreationAttributes = Optional<BydSaleReminderAttributes, "id" | "note" | "createdAt" | "updatedAt" | "created_by">;

class BydSaleReminder extends Model<BydSaleReminderAttributes, BydSaleReminderCreationAttributes>
    implements BydSaleReminderAttributes {
    public id!: number;
    public task_title!: string;
    public task_date!: Date;
    public note!: string | null;
    public bydSaleId!: number;
    public created_by!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    BydSaleReminder.init(
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
            bydSaleId: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: { model: "byd_sales", key: "id" },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            created_by: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
                references: { model: "users", key: "id" }
            }
        },
        {
            sequelize,
            tableName: "byd_sale_reminders",
            timestamps: true,
        }
    );

    return BydSaleReminder;
};
