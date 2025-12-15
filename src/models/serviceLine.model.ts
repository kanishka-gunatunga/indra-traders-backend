import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface ServiceLineAttributes {
    id: number;
    name: string;
    type: "REPAIR" | "PAINT" | "ADDON";
    branch_id: number;
    advisor: string;
    status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
}

export interface ServiceLineCreationAttributes extends Optional<ServiceLineAttributes, "id" | "status"> {
}

class ServiceLine extends Model<ServiceLineAttributes, ServiceLineCreationAttributes> implements ServiceLineAttributes {
    public id!: number;
    public name!: string;
    public type!: "REPAIR" | "PAINT" | "ADDON";
    public branch_id!: number;
    public advisor!: string;
    public status!: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
}

export default (sequelize: Sequelize) => {
    ServiceLine.init({
        id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
        name: {type: DataTypes.STRING(100), allowNull: false},
        type: {type: DataTypes.ENUM("REPAIR", "PAINT", "ADDON"), allowNull: false},
        branch_id: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false},
        advisor: {type: DataTypes.STRING(100), allowNull: false},
        status: {type: DataTypes.ENUM("ACTIVE", "INACTIVE", "MAINTENANCE"), defaultValue: "ACTIVE"}
    }, {sequelize, tableName: "isp_service_lines", timestamps: true});
    return ServiceLine;
};