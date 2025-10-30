import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface InvoiceAttributes {
    id: number;
    invoice_no: string;
    date: Date;
    customer_id: string;
    total_amount: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type InvoiceCreationAttributes = Optional<InvoiceAttributes, "id" | "total_amount">;

class Invoice extends Model<InvoiceAttributes, InvoiceCreationAttributes> implements InvoiceAttributes {
    public id!: number;
    public invoice_no!: string;
    public date!: Date;
    public customer_id!: string;
    public total_amount!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    Invoice.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true
            },
            invoice_no: {
                type: DataTypes.STRING(100),
                allowNull: false,
                // unique: true
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false
            },
            customer_id: {
                type: DataTypes.STRING,
                allowNull: false
            },
            total_amount: {
                type: DataTypes.FLOAT.UNSIGNED,
                allowNull: false,
                defaultValue: 0
            },
        },
        {sequelize, tableName: "invoices", timestamps: true}
    );
    return Invoice;
};
