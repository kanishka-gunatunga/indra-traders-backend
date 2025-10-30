import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface SparePartSaleFollowupAttributes {
    id: number;
    activity: string;
    activity_date: Date;
    spare_part_sale_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type SparePartSaleFollowupCreationAttributes = Optional<SparePartSaleFollowupAttributes, "id" | "createdAt" | "updatedAt">;

class SparePartSaleFollowup extends Model<SparePartSaleFollowupAttributes, SparePartSaleFollowupCreationAttributes> implements SparePartSaleFollowupAttributes {
    public id!: number;
    public activity!: string;
    public activity_date!: Date;
    public spare_part_sale_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    SparePartSaleFollowup.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            activity: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            activity_date: {
                type: DataTypes.DATE,
                allowNull: false
            },
            spare_part_sale_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: {model: "spare_part_sales", key: "id"},
                onDelete: "CASCADE",
                onUpdate: "CASCADE"
            },
        },
        {
            sequelize,
            tableName: "spare_part_sale_followups",
            timestamps: true,
        }
    );
    return SparePartSaleFollowup;
};
