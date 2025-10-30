import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export interface BestMatchAttributes {
    id: number;
    direct_request_id: number;
    vehicle_id: number;
    estimate_price: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface BestMatchCreationAttributes extends Optional<BestMatchAttributes, "id" | "createdAt" | "updatedAt"> {}

export class BestMatch extends Model<BestMatchAttributes, BestMatchCreationAttributes> implements BestMatchAttributes {
    public id!: number;
    public direct_request_id!: number;
    public vehicle_id!: number;
    public estimate_price!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    BestMatch.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            direct_request_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
            },
            vehicle_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
            },
            estimate_price: {
                type: DataTypes.DECIMAL(15, 2),
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: "fast_track_best_matches",
            timestamps: true,
        }
    );

    return BestMatch;
};