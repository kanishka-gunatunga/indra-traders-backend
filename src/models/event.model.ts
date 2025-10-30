import {
    DataTypes,
    Model,
    Optional,
    Sequelize,
} from "sequelize";

export interface EventAttributes {
    id: string;
    title: string;
    date: Date;
    customerId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type CustomerCreationAttributes = Optional<EventAttributes, "id" | "createdAt" | "updatedAt">;

class Event extends Model<EventAttributes, CustomerCreationAttributes> implements EventAttributes {
    public id!: string;
    public title!: string;
    public date!: Date;
    public customerId!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    Event.init(
        {
            id: {
                type: DataTypes.STRING,
                primaryKey: true,
            },
            title: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            customerId: {
                type: DataTypes.STRING,
                allowNull: true,
                references: {
                    model: 'customers',
                    key: "id",
                },
                onDelete: "SET NULL",
                onUpdate: "CASCADE",
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
            tableName: "events",
            timestamps: true,
        }
    );

    return Event;
}

