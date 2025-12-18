import {DataTypes, Model, Optional, Sequelize} from "sequelize";

export interface BookingAttributes {
    id: number;
    branch_id: number;
    service_line_id: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: 'PENDING' | 'BOOKED' | 'COMPLETED' | 'CANCELLED';
    customer_id?: string;
    vehicle_no?: string;
}

export interface BookingCreationAttributes extends Optional<BookingAttributes, "id"> {
}

class ServiceParkBookingModel extends Model<BookingAttributes, BookingCreationAttributes> implements BookingAttributes {
    public id!: number;
    public branch_id!: number;
    public service_line_id!: number;
    public booking_date!: string;
    public start_time!: string;
    public end_time!: string;
    public status!: 'PENDING' | 'BOOKED' | 'COMPLETED' | 'CANCELLED';
    public customer_id?: string;
    public vehicle_no?: string;
}

export default (sequelize: Sequelize) => {
    ServiceParkBookingModel.init({
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        branch_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        // service_line_id: {
        //     type: DataTypes.INTEGER.UNSIGNED,
        //     allowNull: false,
        // },
        service_line_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        customer_id: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        booking_date: {type: DataTypes.DATEONLY, allowNull: false},
        start_time: {type: DataTypes.TIME, allowNull: false},
        end_time: {type: DataTypes.TIME, allowNull: false},
        status: {
            type: DataTypes.ENUM('PENDING', 'BOOKED', 'COMPLETED', 'CANCELLED'),
            defaultValue: 'PENDING'
        },

        vehicle_no: {
            type: DataTypes.STRING(50),
            allowNull: true
        }
    }, {
        sequelize,
        tableName: "isp_bookings",
        timestamps: true
    });
    return ServiceParkBookingModel;
};