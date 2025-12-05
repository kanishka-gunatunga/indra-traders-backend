import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface FollowUpAttributes {
    id: number;
    activity: string;
    activity_date: Date;
    complaintId: number;
    created_by?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type FollowUpCreationAttributes = Optional<FollowUpAttributes, "id" | "createdAt" | "updatedAt" | "created_by">;

class ComplaintFollowUp extends Model<FollowUpAttributes, FollowUpCreationAttributes>
    implements FollowUpAttributes {
    public id!: number;
    public activity!: string;
    public activity_date!: Date;
    public complaintId!: number;
    public created_by!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    ComplaintFollowUp.init(
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
            complaintId: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: { model: "complaints", key: "id" },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            created_by: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
                references: {model: "users", key: "id"}
            }
        },
        {
            sequelize,
            tableName: "complaint_followups",
            timestamps: true,
        }
    );

    return ComplaintFollowUp;
};
