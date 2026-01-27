import { Request, Response } from "express";
import http from "http-status-codes";
import db from "../models";
import { Op } from "sequelize";

const { Service, ServiceParkBooking, Customer, ServiceLine, ServiceParkVehicleHistory } = db;

function toBookingDto(b: any) {
    const sl = b.ServiceLine;
    const cust = b.Customer;
    const st = b.start_time ? String(b.start_time).slice(0, 5) : "";
    const et = b.end_time ? String(b.end_time).slice(0, 5) : "";
    return {
        id: b.id,
        date: b.booking_date,
        start_time: st,
        end_time: et,
        vehicle_no: b.vehicle_no ?? null,
        customer_name: cust?.customer_name ?? null,
        phone_number: cust?.phone_number ?? null,
        status: b.status,
        line_id: sl?.id ?? null,
        service_type: sl?.type ?? null,
    };
}

export const getServiceTypes = async (req: Request, res: Response) => {
    try {
        const rows = await Service.findAll({
            attributes: ["type"],
            raw: true,
        });

        const uniqueTypes = [...new Set((rows as { type: string }[]).map((r) => r.type))];
        const types = uniqueTypes.sort().reverse();
        return res.status(http.OK).json(types);
    } catch (error: any) {
        console.error("getServiceTypes error:", error);
        return res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching service types",
            error: error.message,
        });
    }
}

export const getBookings = async (req: Request, res: Response) => {
    try {
        const date = req.query.date as string;
        const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
        const lineId = req.query.lineId ? Number(req.query.lineId) : undefined;
        const serviceType = (req.query.serviceType as string) || undefined;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(http.BAD_REQUEST).json({
                message: "date is required and must be YYYY-MM-DD",
            });
        }
        if (!branchId || isNaN(branchId) || branchId < 1) {
            return res.status(http.BAD_REQUEST).json({
                message: "branchId is required and must be a positive number",
            });
        }

        const where: Record<string, unknown> = {
            booking_date: date,
            branch_id: branchId,
            status: { [Op.ne]: "CANCELLED" },
        };

        if (lineId != null && !isNaN(lineId)) {
            where.service_line_id = lineId;
        }

        const serviceLineInclude: { model: typeof ServiceLine; attributes: string[]; required?: boolean; where?: { type: string } } = {
            model: ServiceLine,
            attributes: ["id", "name", "type"],
            required: true,
        };
        if (serviceType) {
            serviceLineInclude.where = { type: serviceType };
        }

        const bookings = await ServiceParkBooking.findAll({
            where,
            include: [
                { model: Customer, attributes: ["id", "customer_name", "phone_number"] },
                serviceLineInclude,
            ],
            order: [["start_time", "ASC"]],
        });

        const list = bookings.map((b: any) => toBookingDto(b));

        return res.status(http.OK).json(list);
    } catch (error: any) {
        console.error("getBookings error:", error);
        return res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching bookings",
            error: error.message,
        });
    }
}

export const getBookingById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id ? Number(req.params.id) : NaN;

        if(!req.params.id || isNaN(id) || id < 1) {
            return res.status(http.BAD_REQUEST).json({
                message: "Valid booking id is required",
            });
        }

        const booking = await ServiceParkBooking.findByPk(id, {
            include: [
                {model: Customer, attributes: ["id", "customer_name", "phone_number"]},
                {model: ServiceLine, attributes: ["id", "name", "type"]},
            ],
        });

        if(!booking) {
            return res.status(http.NOT_FOUND).json({
                message: "Booking not found",
            });
        }

        return res.status(http.OK).json(toBookingDto(booking));
    } catch (error: any) {
        console.error("getBookingById error:", error);
        return res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching booking",
            error: error.message,
        });
    }
}

export const createBooking = async (req: Request, res: Response) => {
    try {
        const {
            branch_id,
            line_id,
            date,
            start_time,
            end_time,
            vehicle_no,
            customer_name,
            phone_number,
            status,
        } = req.body;

        if (
            branch_id == null || line_id == null || !date || !start_time || !end_time ||
            !vehicle_no || !customer_name || !phone_number
        ) {
            return res.status(http.BAD_REQUEST).json({
                message: "Missing required fields: branch_id, line_id, date, start_time, end_time, vehicle_no, customer_name, phone_number",
            });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())) {
            return res.status(http.BAD_REQUEST).json({
                message: "date must be YYYY-MM-DD",
            });
        }

        const numBranchId = Number(branch_id);
        const numLineId = Number(line_id);
        if (isNaN(numBranchId) || numBranchId < 1) {
            return res.status(http.BAD_REQUEST).json({
                message: "branch_id must be a positive number",
            });
        }
        if (isNaN(numLineId) || numLineId < 1) {
            return res.status(http.BAD_REQUEST).json({
                message: "line_id must be a positive number",
            });
        }

        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (!timeRegex.test(String(start_time).trim()) || !timeRegex.test(String(end_time).trim())) {
            return res.status(http.BAD_REQUEST).json({
                message: "start_time and end_time must be HH:mm or HH:mm:ss",
            });
        }

        const trimmedDate = String(date).trim();
        const trimmedStart = String(start_time).trim().slice(0, 5); // "HH:mm"
        const trimmedEnd = String(end_time).trim().slice(0, 5);
        const trimmedVehicleNo = String(vehicle_no).trim();
        const trimmedCustomerName = String(customer_name).trim();
        const trimmedPhone = String(phone_number).trim();

        const allowedStatuses = ["PENDING", "BOOKED", "COMPLETED"];
        const finalStatus = status && allowedStatuses.includes(String(status).toUpperCase())
            ? String(status).toUpperCase()
            : "BOOKED";

        // Find or create customer by phone
        let customer = await Customer.findOne({ where: { phone_number: trimmedPhone } });
        if (!customer) {
            customer = await Customer.create({
                id: `CUS${Date.now()}`,
                customer_name: trimmedCustomerName,
                phone_number: trimmedPhone,
            } as any);
        }

        // Adding data to vehicle_histories if not exists
        let vehicle = await ServiceParkVehicleHistory.findOne({ where: { vehicle_no: trimmedVehicleNo } });
        if (!vehicle) {
            vehicle = await ServiceParkVehicleHistory.create({
                vehicle_no: trimmedVehicleNo,
                customer_id: customer.id,
                owner_name: trimmedCustomerName,
                contact_no: trimmedPhone,
                odometer: 0,
            } as any);
        }

        const existing = await ServiceParkBooking.findOne({
            where: {
                branch_id: numBranchId,
                service_line_id: numLineId,
                booking_date: trimmedDate,
                start_time: trimmedStart,
                status: { [Op.ne]: "CANCELLED" },
            },
        });
        if (existing) {
            return res.status(http.CONFLICT).json({
                message: "This slot is already booked for this line and date",
            });
        }

        const booking = await ServiceParkBooking.create({
            branch_id: numBranchId,
            service_line_id: numLineId,
            booking_date: trimmedDate,
            start_time: trimmedStart,
            end_time: trimmedEnd,
            status: finalStatus as "PENDING" | "BOOKED" | "COMPLETED",
            customer_id: customer.id,
            vehicle_no: trimmedVehicleNo,
        });

        const created = await ServiceParkBooking.findByPk(booking.id, {
            include: [
                { model: Customer, attributes: ["customer_name", "phone_number"] },
                { model: ServiceLine, attributes: ["id", "name", "type"] },
            ],
        });
        return res.status(http.CREATED).json(toBookingDto(created));
    } catch (error: any) {
        console.error("createBooking error:", error);
        return res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error creating booking",
            error: error.message,
        });
    }
}

const ALLOWED_STATUSES = ["PENDING", "BOOKED", "COMPLETED", "CANCELLED"] as const;

export const updateBooking = async (req: Request, res: Response) => {
    try {
        const id = req.params.id ? Number(req.params.id) : NaN;
        if (!req.params.id || isNaN(id) || id < 1) {
            return res.status(http.BAD_REQUEST).json({ message: "Valid booking id is required" });
        }

        const { status } = req.body;
        if (!status || typeof status !== "string") {
            return res.status(http.BAD_REQUEST).json({ message: "status is required" });
        }
        const newStatus = String(status).toUpperCase();
        if (!ALLOWED_STATUSES.includes(newStatus as any)) {
            return res.status(http.BAD_REQUEST).json({
                message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
            });
        }

        const booking = await ServiceParkBooking.findByPk(id, {
            include: [
                { model: Customer, attributes: ["customer_name", "phone_number"] },
                { model: ServiceLine, attributes: ["id", "name", "type"] },
            ],
        });
        if (!booking) {
            return res.status(http.NOT_FOUND).json({ message: "Booking not found" });
        }

        await booking.update({ status: newStatus as "PENDING" | "BOOKED" | "COMPLETED" | "CANCELLED" });

        const updated = await ServiceParkBooking.findByPk(booking.id, {
            include: [
                { model: Customer, attributes: ["customer_name", "phone_number"] },
                { model: ServiceLine, attributes: ["id", "name", "type"] },
            ],
        });
        return res.status(http.OK).json(toBookingDto(updated));
    } catch (error: any) {
        console.error("updateBooking error:", error);
        return res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error updating booking",
            error: error.message,
        });
    }
};