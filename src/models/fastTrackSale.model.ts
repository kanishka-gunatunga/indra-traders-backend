// import {DataTypes, Model, Optional, Sequelize} from "sequelize";
//
// export interface SaleAttributes {
//     id: number;
//     ticket_number: string;
//     customer_id: string;
//     vehicle_id: number;
//     direct_request_id: number;
//     call_agent_id: number;
//     assigned_sales_id?: number | null;
//     status: "NEW" | "ONGOING" | "WON" | "LOST";
//     price_range_min: number;
//     price_range_max: number;
//     additional_note?: string | null;
//     createdAt?: Date;
//     updatedAt?: Date;
// }
//
// export interface SaleCreationAttributes extends Optional<SaleAttributes, "id" | "createdAt" | "updatedAt"> {
// }
//
// export class Sale extends Model<SaleAttributes, SaleCreationAttributes> implements SaleAttributes {
//     public id!: number;
//     public ticket_number!: string;
//     public customer_id!: string;
//     public vehicle_id!: number;
//     public direct_request_id!: number;
//     public call_agent_id!: number;
//     public assigned_sales_id!: number | null;
//     public status!: "NEW" | "ONGOING" | "WON" | "LOST";
//     public price_range_min!: number;
//     public price_range_max!: number;
//     public additional_note!: string | null;
//     public readonly createdAt!: Date;
//     public readonly updatedAt!: Date;
// }
//
// export default (sequelize: Sequelize) => {
//     Sale.init(
//         {
//             id: {
//                 type: DataTypes.INTEGER.UNSIGNED,
//                 autoIncrement: true,
//                 primaryKey: true,
//             },
//             ticket_number: {
//                 type: DataTypes.STRING(50),
//                 allowNull: false,
//                 // unique: true,
//             },
//             customer_id: {
//                 type: DataTypes.STRING,
//                 allowNull: false,
//             },
//             vehicle_id: {
//                 type: DataTypes.INTEGER.UNSIGNED,
//                 allowNull: false,
//             },
//             direct_request_id: {
//                 type: DataTypes.INTEGER.UNSIGNED,
//                 allowNull: false,
//             },
//             call_agent_id: {
//                 type: DataTypes.INTEGER.UNSIGNED,
//                 allowNull: false,
//             },
//             assigned_sales_id: {
//                 type: DataTypes.INTEGER.UNSIGNED,
//                 allowNull: true,
//             },
//             status: {
//                 type: DataTypes.ENUM("NEW", "ONGOING", "WON", "LOST"),
//                 allowNull: false,
//                 defaultValue: "NEW",
//             },
//             price_range_min: {
//                 type: DataTypes.DECIMAL(15, 2),
//                 allowNull: false,
//             },
//             price_range_max: {
//                 type: DataTypes.DECIMAL(15, 2),
//                 allowNull: false,
//             },
//             additional_note: {
//                 type: DataTypes.TEXT,
//                 allowNull: true,
//             },
//             createdAt: {
//                 type: DataTypes.DATE,
//                 allowNull: false,
//             },
//             updatedAt: {
//                 type: DataTypes.DATE,
//                 allowNull: false,
//             },
//         },
//         {
//             sequelize,
//             tableName: "fast_track_sales",
//             timestamps: true,
//         }
//     );
//
//     return Sale;
// };

import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export type FastTrackSaleStatus = "NEW" | "ONGOING" | "WON" | "LOST";

export interface FastTrackSaleAttrs {
    id: number;
    ticket_number: string;
    customer_id: string;
    vehicle_id: number;
    direct_request_id: number;
    call_agent_id: number;
    assigned_sales_id?: number | null;
    current_level: 1 | 2 | 3;
    branch: string;
    status: FastTrackSaleStatus;
    price_range_min: number;
    price_range_max: number;
    additional_note?: string | null;
    priority: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export type FastTrackSaleCreate = Optional<
    FastTrackSaleAttrs,
    "id" | "ticket_number" | "assigned_sales_id" | "status" | "additional_note" | "priority" | "current_level"
>;

export class FastTrackSale
    extends Model<FastTrackSaleAttrs, FastTrackSaleCreate>
    implements FastTrackSaleAttrs {
    id!: number;
    ticket_number!: string;
    customer_id!: string;
    vehicle_id!: number;
    direct_request_id!: number;
    call_agent_id!: number;
    assigned_sales_id!: number | null;
    public current_level!: 1 | 2 | 3;
    public branch!: string;
    status!: FastTrackSaleStatus;
    price_range_min!: number;
    price_range_max!: number;
    additional_note!: string | null;
    priority!: number;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    FastTrackSale.init(
        {
            id: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
            ticket_number: {type: DataTypes.STRING(50), allowNull: false},
            customer_id: {type: DataTypes.STRING, allowNull: false},
            vehicle_id: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false},
            direct_request_id: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false},
            call_agent_id: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false},
            assigned_sales_id: {type: DataTypes.INTEGER.UNSIGNED, allowNull: true},
            current_level: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: { isIn: [[1, 2, 3]] }
            },
            branch: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM("NEW", "ONGOING", "WON", "LOST"),
                allowNull: false,
                defaultValue: "NEW",
            },
            price_range_min: {type: DataTypes.DECIMAL(15, 2), allowNull: false},
            price_range_max: {type: DataTypes.DECIMAL(15, 2), allowNull: false},
            additional_note: {type: DataTypes.TEXT, allowNull: true},
            priority: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
        },
        {sequelize, tableName: "fast_track_sales", timestamps: true}
    );
    return FastTrackSale;
};
