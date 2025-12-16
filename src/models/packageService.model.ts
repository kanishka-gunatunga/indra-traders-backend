import {DataTypes, Model, Sequelize} from "sequelize";

class PackageServiceModel extends Model {
}

export default (sequelize: Sequelize) => {
    PackageServiceModel.init({
        package_id: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true},
        service_id: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true}
    }, {sequelize, tableName: "isp_package_services", timestamps: true});
    return PackageServiceModel;
};