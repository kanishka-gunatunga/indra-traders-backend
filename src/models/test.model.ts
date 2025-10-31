import {DataTypes, Model, Optional, Sequelize} from "sequelize";
import db from "../models";

// const {sequelize} = db;

interface UserAttributes {
    id: number;
    full_name: string;
    contact_no: string;
    email: string;
    user_role: "SALES01" | "SALES02" | "CALLAGENT" | "ADMIN" | "TELEMARKETER";
    department: "ITPL" | "ISP" | "IMS" | "IFT";
    branch: "BAMBALAPITIYA" | "KANDY" | "JAFFNA" | "GALLE" | "NEGOMBO";
    password: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, "id"> {
}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: number;
    public full_name!: string;
    public contact_no!: string;
    public email!: string;
    public user_role!: "SALES01" | "SALES02" | "CALLAGENT" | "ADMIN" | "TELEMARKETER";
    public department!: "ITPL" | "ISP" | "IMS" | "IFT";
    public branch!: "BAMBALAPITIYA" | "KANDY" | "JAFFNA" | "GALLE" | "NEGOMBO";
    public password!: string;
}

export default (sequelize: Sequelize) => {
    User.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            full_name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            contact_no: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING(100),
                allowNull: false,
                // unique: true,
            },
            user_role: {
                type: DataTypes.ENUM("SALES01", "SALES02", "CALLAGENT", "ADMIN", "TELEMARKETER"),
                allowNull: false,
            },
            department: {
                type: DataTypes.ENUM("ITPL", "ISP", "IMS", "IFT"),
                allowNull: false,
            },
            branch: {
                type: DataTypes.ENUM("BAMBALAPITIYA", "KANDY", "JAFFNA", "GALLE", "NEGOMBO"),
                allowNull: false,
            },
            password: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: "test-users",
            timestamps: false,
        }
    );

    return User;
}

// export default User;
