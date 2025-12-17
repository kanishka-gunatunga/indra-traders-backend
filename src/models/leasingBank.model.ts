import {DataTypes, Model, Optional, Sequelize} from "sequelize";

interface LeasingBankAttributes {
    id: number;
    bank_name: string;
    interest_rate: number;
    available_months: number[];
    is_active: boolean;
}

interface LeasingBankCreationAttributes extends Optional<LeasingBankAttributes, "id" | "is_active"> {
}

class LeasingBank extends Model<LeasingBankAttributes, LeasingBankCreationAttributes> implements LeasingBankAttributes {
    public id!: number;
    public bank_name!: string;
    public interest_rate!: number;
    public available_months!: number[];
    public is_active!: boolean;
}

export default (sequelize: Sequelize) => {
    LeasingBank.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            bank_name: {
                type: DataTypes.STRING(100),
                allowNull: false,
                // unique: true,
            },
            interest_rate: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: false,
            },
            available_months: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: [12, 24, 36, 48, 60],
                comment: "Array of allowable duration in months"
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            }
        },
        {
            sequelize,
            tableName: "leasing_banks",
            timestamps: true,
        }
    );

    return LeasingBank;
};