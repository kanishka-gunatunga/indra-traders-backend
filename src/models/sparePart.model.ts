import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface SparePartAttributes {
    id: number;
    part_no: string;
    name: string;
    category: string;
    compatibility?: string | null;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type SparePartCreationAttributes = Optional<SparePartAttributes, "id" | "compatibility" | "description">;

class SparePart extends Model<SparePartAttributes, SparePartCreationAttributes> implements SparePartAttributes {
    public id!: number;
    public part_no!: string;
    public name!: string;
    public category!: string;
    public compatibility!: string | null;
    public description!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    SparePart.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            part_no: {
                type: DataTypes.STRING(100),
                allowNull: false,
                // unique: true
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            category: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            compatibility: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
        },
        {
            sequelize,
            tableName: "spare_parts",
            timestamps: true,
        }
    );

    return SparePart;
};
