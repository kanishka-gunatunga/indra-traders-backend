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

// Helper function to map database status to frontend format
// Frontend will determine actual status based on booking time
function mapStatus(dbStatus: string): string {
  // Simple mapping - frontend will override based on time
  if (dbStatus === "COMPLETED") {
    return "Completed";
  }
  // For BOOKED and PENDING, return Pending - frontend will determine actual status
  return "Pending";
}

export const getScheduledServices = async (req: Request, res: Response) => {
  try {
    // Extract and validate branchId
    const branchId = req.query.branchId ? Number(req.query.branchId) : null;

    if (!branchId || isNaN(branchId)) {
      return res.status(http.BAD_REQUEST).json({
        error: "branchId is required",
      });
    }

    // Extract date (optional, default to today)
    let date = req.query.date as string;
    if (!date) {
      const today = new Date();
      date = today.toISOString().split("T")[0]; // YYYY-MM-DD format
    }

    // Validate date format (should be YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(http.BAD_REQUEST).json({
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Optional: Verify branch exists
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(http.NOT_FOUND).json({
        error: "Branch not found",
      });
    }

    // Query bookings with joins
    const bookings = await ServiceParkBooking.findAll({
      where: {
        branch_id: branchId,
        booking_date: date,
        status: { [Op.ne]: "CANCELLED" }, // Exclude cancelled bookings
      },
      include: [
        {
          model: Customer,
          attributes: ["customer_name"],
          required: false, // LEFT JOIN in case customer_id is null
        },
        {
          model: ServiceLine,
          attributes: ["name", "advisor"],
          required: false, // LEFT JOIN in case service_line_id is invalid
        },
        {
          model: ServiceParkVehicleHistory,
          as: "vehicle",
          attributes: ["vehicle_no", "owner_name"],
          required: false, // LEFT JOIN - in case vehicle_no doesn't exist
        },
      ],
      order: [["start_time", "ASC"]], // Order by time, earliest first
    });

    // Transform data to match API specification
    const response = bookings.map((booking) => {
      // Access included models - Sequelize uses model name when no alias is defined
      const serviceLine = (booking as any).ServiceLine;
      const customer = (booking as any).Customer;
      const vehicle = (booking as any).vehicle;

      return {
        time: formatTimeTo12Hour(booking.start_time),
        cab: `CAB - ${booking.vehicle_no || "N/A"}`,
        customer: customer?.customer_name || "N/A",
        service: serviceLine?.name || "N/A", // Using ServiceLine name as service name
        bay: serviceLine?.name || "N/A", // Using ServiceLine name as bay
        vehicle: vehicle?.owner_name || booking.vehicle_no || "N/A",
        technician: serviceLine?.advisor || "N/A",
        status: mapStatus(booking.status),
      };
    });

    return res.status(http.OK).json(response);
  } catch (error: any) {
    console.error("Get Scheduled Services Error: ", error);
    return res.status(http.INTERNAL_SERVER_ERROR).json({
      error: error.message || "Internal server error",
    });
  }
};
