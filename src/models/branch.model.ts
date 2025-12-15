import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface BranchAttributes {
    id: number;
    name: string;
    location_code: string;
    contact_number: string;
    address: string;
    is_active: boolean;
}

export interface BranchCreationAttributes extends Optional<BranchAttributes, "id" | "is_active"> {
}

class Branch extends Model<BranchAttributes, BranchCreationAttributes> implements BranchAttributes {
    public id!: number;
    public name!: string;
    public location_code!: string;
    public contact_number!: string;
    public address!: string;
    public is_active!: boolean;
}

export default (sequelize: Sequelize) => {
    Branch.init({
        id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
        name: {type: DataTypes.STRING(100), allowNull: false},
        location_code: {type: DataTypes.STRING(50), allowNull: false, unique: true},
        contact_number: {type: DataTypes.STRING(20), allowNull: false},
        address: {type: DataTypes.STRING(255), allowNull: false},
        is_active: {type: DataTypes.BOOLEAN, defaultValue: true}
    }, {sequelize, tableName: "isp_branches", timestamps: true});
    return Branch;
};