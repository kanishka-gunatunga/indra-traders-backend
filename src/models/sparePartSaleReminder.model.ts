import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface SparePartSaleReminderAttributes {
    id: number;
    task_title: string;
    task_date: Date;
    note?: string | null;
    spare_part_sale_id: number;
    created_by?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type SparePartSaleReminderCreationAttributes = Optional<SparePartSaleReminderAttributes, "id" | "note" | "createdAt" | "updatedAt" | "created_by">;

class SparePartSaleReminder extends Model<SparePartSaleReminderAttributes, SparePartSaleReminderCreationAttributes> implements SparePartSaleReminderAttributes {
    public id!: number;
    public task_title!: string;
    public task_date!: Date;
    public note!: string | null;
    public spare_part_sale_id!: number;
    public created_by!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    SparePartSaleReminder.init(
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
            spare_part_sale_id: {
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
            tableName: "spare_part_sale_reminders",
            timestamps: true,
        }
    );
    return SparePartSaleReminder;
};
