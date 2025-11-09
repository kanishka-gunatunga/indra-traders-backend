// import { DataTypes, Model, Optional, Sequelize } from "sequelize";
//
// export interface FollowupAttributes {
//     id: number;
//     sale_id: number;
//     activity: string;
//     activity_date: Date;
//     createdAt?: Date;
//     updatedAt?: Date;
// }
//
// export interface FollowupCreationAttributes extends Optional<FollowupAttributes, "id" | "createdAt" | "updatedAt"> {}
//
// export class Followup extends Model<FollowupAttributes, FollowupCreationAttributes> implements FollowupAttributes {
//     public id!: number;
//     public sale_id!: number;
//     public activity!: string;
//     public activity_date!: Date;
//     public readonly createdAt!: Date;
//     public readonly updatedAt!: Date;
// }
//
// export default (sequelize: Sequelize) => {
//     Followup.init(
//         {
//             id: {
//                 type: DataTypes.INTEGER.UNSIGNED,
//                 autoIncrement: true,
//                 primaryKey: true,
//             },
//             sale_id: {
//                 type: DataTypes.INTEGER.UNSIGNED,
//                 allowNull: false,
//             },
//             activity: {
//                 type: DataTypes.STRING(255),
//                 allowNull: false,
//             },
//             activity_date: {
//                 type: DataTypes.DATE,
//                 allowNull: false,
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
//             tableName: "fast_track_followups",
//             timestamps: true,
//         }
//     );
//
//     return Followup;
// };

import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface FastTrackFollowupAttrs {
    id: number;
    sale_id: number;
    activity: string;
    activity_date: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export type FastTrackFollowupCreate = Optional<FastTrackFollowupAttrs, "id">;

export class FastTrackFollowup
    extends Model<FastTrackFollowupAttrs, FastTrackFollowupCreate>
    implements FastTrackFollowupAttrs {
    id!: number;
    sale_id!: number;
    activity!: string;
    activity_date!: Date;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;
}

export default (sequelize: Sequelize) => {
    FastTrackFollowup.init(
        {
            id: {type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true},
            sale_id: {type: DataTypes.INTEGER.UNSIGNED, allowNull: false},
            activity: {type: DataTypes.STRING(255), allowNull: false},
            activity_date: {type: DataTypes.DATE, allowNull: false},
        },
        {sequelize, tableName: "fast_track_followups", timestamps: true}
    );
    return FastTrackFollowup;
};
