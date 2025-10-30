import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface ServiceParkSaleFollowupAttributes {
    id: number;
    activity: string;
    activity_date: Date;
    service_park_sale_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type ServiceParkSaleFollowupCreationAttributes = Optional<ServiceParkSaleFollowupAttributes, "id" | "createdAt" | "updatedAt">;

class ServiceParkSaleFollowup extends Model<ServiceParkSaleFollowupAttributes, ServiceParkSaleFollowupCreationAttributes> implements ServiceParkSaleFollowupAttributes {
    public id!: number;
    public activity!: string;
    public activity_date!: Date;
    public service_park_sale_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    ServiceParkSaleFollowup.init(
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
            service_park_sale_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: {model: "spare_part_sales", key: "id"},
                onDelete: "CASCADE",
                onUpdate: "CASCADE"
            },
        },
        {
            sequelize,
            tableName: "service_park_sale_followups",
            timestamps: true,
        }
    );
    return ServiceParkSaleFollowup;
};
