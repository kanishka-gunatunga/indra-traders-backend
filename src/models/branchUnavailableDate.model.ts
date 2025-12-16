import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface BranchUnavailableDateAttributes {
    id: number;
    branch_id: number;
    date: string | Date;
    reason?: string;
}

export interface BranchUnavailableDateCreationAttributes extends Optional<BranchUnavailableDateAttributes, "id" | "reason"> {
}

class BranchUnavailableDate extends Model<BranchUnavailableDateAttributes, BranchUnavailableDateCreationAttributes> implements BranchUnavailableDateAttributes {
    public id!: number;
    public branch_id!: number;
    public date!: Date;
    public reason!: string;
}

export default (sequelize: Sequelize) => {
    BranchUnavailableDate.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            branch_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false
            },
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false
            },
            reason: {
                type: DataTypes.STRING(255),
                allowNull: true
            }
        }, {
            sequelize,
            tableName: "isp_branch_unavailable_dates",
            timestamps: true
        });
    return BranchUnavailableDate;
};