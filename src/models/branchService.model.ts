import {DataTypes, Model, Sequelize} from "sequelize";

export interface BranchServiceAttributes {
    branch_id: number;
    service_id: number;
    price: number;
    is_available: boolean;
}

class BranchService extends Model<BranchServiceAttributes> implements BranchServiceAttributes {
    public branch_id!: number;
    public service_id!: number;
    public price!: number;
    public is_available!: boolean;
}

export default (sequelize: Sequelize) => {
    BranchService.init({
        branch_id: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true},
        service_id: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true},
        price: {type: DataTypes.DECIMAL(10, 2), allowNull: false},
        is_available: {type: DataTypes.BOOLEAN, defaultValue: true}
    }, {sequelize, tableName: "isp_branch_services", timestamps: true});
    return BranchService;
};