import { Request, Response } from "express";
import http from "http-status-codes";
import { Op } from "sequelize";
import db from "../models";

const { ServiceParkBooking, Customer, ServiceLine, ServiceParkVehicleHistory, Branch } = db;

// Helper function to convert 24-hour time to 12-hour format
function formatTimeTo12Hour(time24: string): string {
    // Input: "14:30:00" or "14:30"
    // Output: "2:30 PM"
    const [hours, minutes] = time24.slice(0, 5).split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${ampm}`;
}

// Helper function to determine status based on booking data and current time
function determineStatus(booking: any, currentDate: string, currentTime: string): string {
    const bookingDate = booking.booking_date;
    const startTime = booking.start_time.slice(0, 5); // HH:mm
    const endTime = booking.end_time.slice(0, 5); // HH:mm
    
    // If booking is marked as COMPLETED in database
    if (booking.status === 'COMPLETED') {
        return "Completed";
    }
    
    // If booking is CANCELLED, skip it (we filter these out in query)
    if (booking.status === 'CANCELLED') {
        return "Completed"; // Or we can skip these entirely
    }
    
    // If booking date is in the future
    if (bookingDate > currentDate) {
        return "Upcoming";
    }
    
    // If booking date is today
    if (bookingDate === currentDate) {
        // If current time is between start and end time
        if (currentTime >= startTime && currentTime <= endTime) {
            return "In Progress";
        }
        
        // If start time has passed but not in progress
        if (currentTime > startTime) {
            return "Pending";
        }
        
        // If start time is in the future
        if (currentTime < startTime) {
            return "Upcoming";
        }
    }
    
    // If booking date is in the past
    if (bookingDate < currentDate) {
        // Past booking - if not completed, consider it pending or completed based on end time
        if (currentTime > endTime || bookingDate < currentDate) {
            return "Completed";
        }
        return "Pending";
    }
    
    // Default fallback
    return "Pending";
}

export const getScheduledServices = async (req: Request, res: Response) => {
    try {
        // Extract and validate branchId
        const branchId = req.query.branchId ? Number(req.query.branchId) : null;
        
        if (!branchId || isNaN(branchId)) {
            return res.status(http.BAD_REQUEST).json({
                error: "branchId is required"
            });
        }
        
        // Extract date (optional, default to today)
        let date = req.query.date as string;
        if (!date) {
            const today = new Date();
            date = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
        
        // Validate date format (should be YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(http.BAD_REQUEST).json({
                error: "Invalid date format. Use YYYY-MM-DD"
            });
        }
        
        // Optional: Verify branch exists
        const branch = await Branch.findByPk(branchId);
        if (!branch) {
            return res.status(http.NOT_FOUND).json({
                error: "Branch not found"
            });
        }
        
        // Get current date and time for status determination
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentTime = now.toTimeString().slice(0, 5); // HH:mm
        
        // Query bookings with joins
        const bookings = await ServiceParkBooking.findAll({
            where: {
                branch_id: branchId,
                booking_date: date,
                status: { [Op.ne]: 'CANCELLED' } // Exclude cancelled bookings
            },
            include: [
                {
                    model: Customer,
                    attributes: ['customer_name'],
                    required: false // LEFT JOIN in case customer_id is null
                },
                {
                    model: ServiceLine,
                    attributes: ['name', 'advisor'],
                    required: false // LEFT JOIN in case service_line_id is invalid
                },
                {
                    model: ServiceParkVehicleHistory,
                    as: 'vehicle',
                    attributes: ['vehicle_no', 'owner_name'],
                    required: false // LEFT JOIN - in case vehicle_no doesn't exist
                }
            ],
            order: [['start_time', 'ASC']] // Order by time, earliest first
        });
        
        // Transform data to match API specification
        const response = bookings.map(booking => {
            // Access included models - Sequelize uses model name when no alias is defined
            const serviceLine = (booking as any).ServiceLine;
            const customer = (booking as any).Customer;
            const vehicle = (booking as any).vehicle;
            
            return {
                time: formatTimeTo12Hour(booking.start_time),
                cab: `CAB - ${booking.vehicle_no || 'N/A'}`,
                customer: customer?.customer_name || 'N/A',
                service: serviceLine?.name || 'N/A', // Using ServiceLine name as service name
                bay: serviceLine?.name || 'N/A', // Using ServiceLine name as bay
                vehicle: vehicle?.owner_name || booking.vehicle_no || 'N/A',
                technician: serviceLine?.advisor || 'N/A',
                status: determineStatus(booking, currentDate, currentTime)
            };
        });
        
        return res.status(http.OK).json(response);
        
    } catch (error: any) {
        console.error("Get Scheduled Services Error: ", error);
        return res.status(http.INTERNAL_SERVER_ERROR).json({
            error: error.message || "Internal server error"
        });
    }
};
