import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface FollowUpAttributes {
    id: number;
    activity: string;
    activity_date: Date;
    vehicleSaleId: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type FollowUpCreationAttributes = Optional<FollowUpAttributes, "id" | "createdAt" | "updatedAt">;

class FollowUp extends Model<FollowUpAttributes, FollowUpCreationAttributes>
    implements FollowUpAttributes {
    public id!: number;
    public activity!: string;
    public activity_date!: Date;
    public vehicleSaleId!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    FollowUp.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            activity: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            activity_date: {
                type: DataTypes.DATE,
                allowNull: false,
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
            tableName: "vehicle_sale_followups",
            timestamps: true,
        }
    );

    return FollowUp;
};
