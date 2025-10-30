import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface PromotionAttributes {
    id: number;
    category: string;
    points: number;
    promo_code?: string | null;
    discount_percent?: number | null;
    starts_at?: Date | null;
    ends_at?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type PromotionCreationAttributes = Optional<PromotionAttributes, "id" | "promo_code" | "discount_percent" | "starts_at" | "ends_at">;

class Promotion extends Model<PromotionAttributes, PromotionCreationAttributes> implements PromotionAttributes {
    public id!: number;
    public category!: string;
    public points!: number;
    public promo_code!: string | null;
    public discount_percent!: number | null;
    public starts_at!: Date | null;
    public ends_at!: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    Promotion.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            category: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            points: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0
            },
            promo_code: {
                type: DataTypes.STRING(100),
                allowNull: true,
                // unique: true
            },
            discount_percent: {
                type: DataTypes.FLOAT,
                allowNull: true
            },
            starts_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            ends_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
        },
        {
            sequelize,
            tableName: "promotions",
            timestamps: true
        }
    );
    return Promotion;
};
