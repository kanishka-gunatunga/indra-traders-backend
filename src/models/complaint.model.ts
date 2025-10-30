import {
    DataTypes,
    Model,
    Optional,
    Sequelize,
} from "sequelize";

export type ComplaintStatus = "New" | "In Review" | "Processing" | "Approval" | "Completed";

export interface ComplaintAttributes {
    id: number;
    ticket_no: string;
    category: string;
    title: string;
    preferred_solution?: string | null;
    description?: string | null;
    status: ComplaintStatus;
    progress?: number;
    contact_no?: string | null;
    vehicle_no?: string | null;
    comment?: string | null;
    customerId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type ComplaintCreationAttributes = Optional<ComplaintAttributes, "id" | "ticket_no" | "status" | "progress" | "createdAt" | "updatedAt" | "customerId">;

class Complaint extends Model<ComplaintAttributes, ComplaintCreationAttributes> implements ComplaintAttributes {
    public id!: number;
    public ticket_no!: string;
    public category!: string;
    public title!: string;
    public preferred_solution!: string | null;
    public description!: string | null;
    public status!: ComplaintStatus;
    public progress!: number;
    public contact_no!: string | null;
    public vehicle_no!: string | null;
    public customerId!: string;
    public comment!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    Complaint.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },
            ticket_no: {
                type: DataTypes.STRING(50),
                allowNull: false,
                // unique: true,
            },
            category: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            title: {
                type: DataTypes.STRING(200),
                allowNull: false,
            },
            preferred_solution: {
                type: DataTypes.STRING(200),
                allowNull: true,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM("New", "In Review", "Processing", "Approval", "Completed"),
                allowNull: false,
                defaultValue: "New",
            },
            progress: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                defaultValue: 0,
            },
            contact_no: {
                type: DataTypes.STRING(30),
                allowNull: true,
            },
            vehicle_no: {
                type: DataTypes.STRING(50),
                allowNull: true,
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
            comment: {
                type: DataTypes.TEXT,
                allowNull: true,
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
            tableName: "complaints",
            timestamps: true,
        }
    );

    return Complaint;
}
