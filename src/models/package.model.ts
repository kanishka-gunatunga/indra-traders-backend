import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface PackageAttributes {
    id: number;
    name: string;
    description?: string;
    total_price: number;
}

export interface PackageCreationAttributes extends Optional<PackageAttributes, "id" | "description"> {
}

class Package extends Model<PackageAttributes, PackageCreationAttributes> implements PackageAttributes {
    public id!: number;
    public name!: string;
    public description!: string;
    public total_price!: number;
}

export default (sequelize: Sequelize) => {
    Package.init({
        id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
        name: {type: DataTypes.STRING(150), allowNull: false},
        description: {type: DataTypes.TEXT, allowNull: true},
        total_price: {type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00}
    }, {sequelize, tableName: "isp_packages", timestamps: true});
    return Package;
};