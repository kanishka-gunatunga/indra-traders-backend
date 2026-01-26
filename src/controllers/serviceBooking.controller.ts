import { Request, Response } from "express";
import http from "http-status-codes";
import { Op } from "sequelize";
import db from "../models";

const {
  ServiceParkBooking,
  Customer,
  ServiceLine,
  ServiceParkVehicleHistory,
  Branch,
} = db;

// Helper function to convert 24-hour time to 12-hour format
function formatTimeTo12Hour(time24: string): string {
  const [hours, minutes] = time24.slice(0, 5).split(":");
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? "PM" : "AM";

  return `${hour12}:${minutes} ${ampm}`;
}

export const getScheduledServices = async (req: Request, res: Response) => {
  try {
    const branchId = req.query.branchId ? Number(req.query.branchId) : null;
    const date = req.query.date as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const offset = (page - 1) * limit;

    const whereClause: any = {
      status: { [Op.ne]: "CANCELLED" }
    };

    if (branchId && !isNaN(branchId)) {
      whereClause.branch_id = branchId;
    }

    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(http.BAD_REQUEST).json({
          error: "Invalid date format. Use YYYY-MM-DD",
        });
      }
      whereClause.booking_date = date;
    }

    // Query bookings with joins
    const { count, rows: bookings } = await ServiceParkBooking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          attributes: ["customer_name"],
          required: false,
        },
        {
          model: ServiceLine,
          attributes: ["name", "advisor", "type"],
          required: false,
        },
        {
          model: ServiceParkVehicleHistory,
          as: "vehicle",
          attributes: ["vehicle_no", "owner_name"],
          required: false,
        },
        {
          model: Branch,
          attributes: ["name"],
          required: false
        }
      ],
      order: [["booking_date", "ASC"], ["start_time", "ASC"]],
      limit,
      offset,
      distinct: true
    });


    const formattedBookings = bookings.map((booking) => {

      const serviceLine = (booking as any).ServiceLine;
      const customer = (booking as any).Customer;
      const vehicle = (booking as any).vehicle;
      const branch = (booking as any).Branch;

      return {
        id: booking.id,
        service_type: serviceLine?.type || "N/A",
        branch_name: branch?.name || "N/A",
        booking_date: booking.booking_date,
        time_range: `${formatTimeTo12Hour(booking.start_time)} - ${formatTimeTo12Hour(booking.end_time)}`,

        // Keep existing fields for compatibility
        time: formatTimeTo12Hour(booking.start_time),
        cab: booking.vehicle_no || "N/A",
        customer: customer?.customer_name || "N/A",
        service: serviceLine?.name || "N/A",
        technician: serviceLine?.advisor || "N/A",
        start_time: booking.start_time.slice(0, 5),
        end_time: booking.end_time.slice(0, 5),
      };
    });

    return res.status(http.OK).json({
      data: formattedBookings,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (error: any) {
    console.error("Get Scheduled Services Error: ", error);
    return res.status(http.INTERNAL_SERVER_ERROR).json({
      error: error.message || "Internal server error",
    });
  }
};
