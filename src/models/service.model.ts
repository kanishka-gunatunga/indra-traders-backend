import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface ServiceAttributes {
    id: number;
    name: string;
    type: "REPAIR" | "PAINT" | "ADDON";
    description?: string;
    base_price: number;
}

export interface ServiceCreationAttributes extends Optional<ServiceAttributes, "id" | "description"> {
}

class Service extends Model<ServiceAttributes, ServiceCreationAttributes> implements ServiceAttributes {
    public id!: number;
    public name!: string;
    public type!: "REPAIR" | "PAINT" | "ADDON";
    public description!: string;
    public base_price!: number;
}

export default (sequelize: Sequelize) => {
    Service.init({
        id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
        name: {type: DataTypes.STRING(150), allowNull: false},
        type: {type: DataTypes.ENUM("REPAIR", "PAINT", "ADDON"), allowNull: false},
        description: {type: DataTypes.TEXT, allowNull: true},
        base_price: {type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00}
    }, {sequelize, tableName: "isp_services", timestamps: true});
    return Service;
};