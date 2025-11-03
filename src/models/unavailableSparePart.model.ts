import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface UnavailableSparePartAttributes {
    id: number;
    date: Date;
    call_agent_id: number;
    vehicle_make: string;
    vehicle_model: string;
    part_no: string;
    year_of_manufacture: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type UnavailableSparePartCreationAttributes = Optional<
    UnavailableSparePartAttributes,
    "id" | "date"
>;

export class UnavailableSparePart
    extends Model<UnavailableSparePartAttributes, UnavailableSparePartCreationAttributes>
    implements UnavailableSparePartAttributes {
    public id!: number;
    public date!: Date;
    public call_agent_id!: number;
    public vehicle_make!: string;
    public vehicle_model!: string;
    public part_no!: string;
    public year_of_manufacture!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    UnavailableSparePart.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            call_agent_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
            },
            vehicle_make: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            vehicle_model: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            part_no: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            year_of_manufacture: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: "unavailable_spare_parts",
            timestamps: true,
        }
    );

    return UnavailableSparePart;
};