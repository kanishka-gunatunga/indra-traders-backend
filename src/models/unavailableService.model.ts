import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface UnavailableServiceAttributes {
    id: number;
    date: Date;
    call_agent_id: number;
    unavailable_repair?: string | null;
    unavailable_paint?: string | null;
    unavailable_add_on?: string | null;
    note: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type UnavailableServiceCreationAttributes = Optional<
    UnavailableServiceAttributes,
    "id" | "date"
>;

export class UnavailableService
    extends Model<UnavailableServiceAttributes, UnavailableServiceCreationAttributes>
    implements UnavailableServiceAttributes {
    public id!: number;
    public date!: Date;
    public call_agent_id!: number;
    public unavailable_repair!: string | null;
    public unavailable_paint!: string | null;
    public unavailable_add_on!: string | null;
    public note!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    UnavailableService.init(
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
            unavailable_repair: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            unavailable_paint: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            unavailable_add_on: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            note: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: "unavailable_services",
            timestamps: true,
        }
    );

    return UnavailableService;
};