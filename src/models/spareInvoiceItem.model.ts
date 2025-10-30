import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface InvoiceItemAttributes {
    id: number;
    invoice_id: number;
    spare_part_id: number;
    spare_part_name: string;
    units: number;
    price: number;
    compatibility?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type InvoiceItemCreationAttributes = Optional<InvoiceItemAttributes, "id" | "compatibility">;

class InvoiceItem extends Model<InvoiceItemAttributes, InvoiceItemCreationAttributes> implements InvoiceItemAttributes {
    public id!: number;
    public invoice_id!: number;
    public spare_part_id!: number;
    public spare_part_name!: string;
    public units!: number;
    public price!: number;
    public compatibility!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    InvoiceItem.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            invoice_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: {model: "invoices", key: "id"},
                onDelete: "CASCADE"
            },
            spare_part_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false
            },
            spare_part_name: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            units: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false
            },
            price: {
                type: DataTypes.FLOAT.UNSIGNED,
                allowNull: false
            },
            compatibility: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
        },
        {
            sequelize,
            tableName: "invoice_items",
            timestamps: true,
        }
    );
    return InvoiceItem;
};
