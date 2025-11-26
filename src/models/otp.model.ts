import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface OtpAttributes {
    id: number;
    phone_number: string;
    otp_code: string;
    expires_at: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

interface OtpCreationAttributes extends Optional<OtpAttributes, "id" | "createdAt" | "updatedAt"> {}

export class OtpModel extends Model<OtpAttributes, OtpCreationAttributes> implements OtpAttributes {
    public id!: number;
    public phone_number!: string;
    public otp_code!: string;
    public expires_at!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    OtpModel.init(
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            phone_number: { type: DataTypes.STRING(30), allowNull: false },
            otp_code: { type: DataTypes.STRING(6), allowNull: false },
            expires_at: { type: DataTypes.DATE, allowNull: false },
        },
        {
            sequelize,
            tableName: "otps",
            timestamps: true,
        }
    );
    return OtpModel;
};