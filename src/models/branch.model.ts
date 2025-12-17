import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface BranchAttributes {
    id: number;
    name: string;
    email?: string | null;
    contact_number: string;
    address: string;
    is_active: boolean;
}

export interface BranchCreationAttributes extends Optional<BranchAttributes, "id" | "is_active"> {
}

class Branch extends Model<BranchAttributes, BranchCreationAttributes> implements BranchAttributes {
    public id!: number;
    public name!: string;
    public email!: string | null;
    public contact_number!: string;
    public address!: string;
    public is_active!: boolean;

    public services?: any[];
}

export default (sequelize: Sequelize) => {
    Branch.init({
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(150),
            allowNull: true,
        },
        contact_number: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        sequelize,
        tableName: "isp_branches",
        timestamps: true
    });
    return Branch;
};