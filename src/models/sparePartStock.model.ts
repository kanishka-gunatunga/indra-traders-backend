import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface SparePartStockAttributes {
    id: number;
    spare_part_id: number;
    branch: string;
    stock: number;
    price: number;
    last_updated?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export type SparePartStockCreationAttributes = Optional<SparePartStockAttributes, "id" | "last_updated">;

class SparePartStock extends Model<SparePartStockAttributes, SparePartStockCreationAttributes> implements SparePartStockAttributes {
    public id!: number;
    public spare_part_id!: number;
    public branch!: string;
    public stock!: number;
    public price!: number;
    public last_updated!: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    SparePartStock.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            spare_part_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: {model: "spare_parts", key: "id"},
                onDelete: "CASCADE",
                onUpdate: "CASCADE"
            },
            branch: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            stock: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0
            },
            price: {
                type: DataTypes.FLOAT.UNSIGNED,
                allowNull: false
            },
            last_updated: {
                type: DataTypes.DATE,
                allowNull: true
            },
        },
        {
            sequelize,
            tableName: "spare_part_stocks",
            timestamps: true,
            indexes: [{fields: ["spare_part_id"]}, {fields: ["branch"]}],
        }
    );
    return SparePartStock;
};
