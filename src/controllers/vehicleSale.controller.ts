import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";
import {Op} from "sequelize";

const {User, VehicleSale, Customer, VehicleSaleReminder, VehicleSaleFollowup} = db;

export const createVehicleSale = async (req: Request, res: Response) => {
    try {
        const {
            date,
            customer_id,
            call_agent_id,
            vehicle_make,
            vehicle_model,
            manufacture_year,
            transmission,
            fuel_type,
            down_payment,
            price_from,
            price_to,
            additional_note,
        } = req.body;

        const newSale = await VehicleSale.create({
            ticket_number: `ITPL${Date.now()}`,
            date,
            customer_id,
            call_agent_id,
            vehicle_make,
            vehicle_model,
            manufacture_year,
            transmission,
            fuel_type,
            down_payment,
            price_from,
            price_to,
            additional_note,
        });

        res.status(http.CREATED).json({
            message: "Vehicle sale created successfully",
            sale: newSale,
        });
    } catch (error) {
        console.error("Error creating vehicle sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const getVehicleSales = async (req: Request, res: Response) => {
    try {
        const statusParam = req.query.status;

        const status =
            typeof statusParam === "string" ? statusParam.toUpperCase() : undefined;

        const whereClause = status
            ? {status}
            : undefined;

        const sales = await VehicleSale.findAll({
            where: whereClause,
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "callAgent"},
                {model: User, as: "salesUser"},
            ],
        });

        res.status(http.OK).json(sales);
    } catch (error) {
        console.error("Error fetching vehicle sales:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getSaleByTicketID = async (req: Request, res: Response) => {
    try {
        const {ticketNumber} = req.params;

        if (!ticketNumber)
            return res.status(http.BAD_REQUEST).json({message: "Ticket number is required"});

        const sale = await VehicleSale.findOne({
            where: {ticket_number: ticketNumber},
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "callAgent"},
                {model: User, as: "salesUser"},
                {model: VehicleSaleFollowup, as: "followups", order: [["activity_date", "DESC"]]},
                {model: VehicleSaleReminder, as: "reminders", order: [["task_date", "ASC"]]}
            ],
        });

        if (!sale)
            return res.status(http.NOT_FOUND).json({message: "Sale not found with this ticket number"});

        res.status(http.OK).json(sale);
    } catch (error) {
        console.error("Error fetching sale by ticket number:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const assignVehicleSale = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {salesUserId} = req.body;

        const sale = await VehicleSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.status = "ONGOING";
        sale.assigned_sales_id = salesUserId;
        await sale.save();

        res.status(http.OK).json({message: "Sale assigned successfully", sale});
    } catch (error) {
        console.error("Error assigning sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const updateSaleStatus = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {status} = req.body;

        const sale = await VehicleSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.status = status;
        await sale.save();

        res.status(http.OK).json({message: "Sale status updated", sale});
    } catch (error) {
        console.error("Error updating sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const deleteVehicleSale = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const sale = await VehicleSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});
        await sale.destroy();
        res.status(http.OK).json({message: "Vehicle sale deleted"});
    } catch (error) {
        console.error("Error deleting sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getVehicleSalesByStatus = async (req: Request, res: Response) => {
    try {
        const {status} = req.params;

        const whereClause = {status: status.toUpperCase()};

        const sales = await VehicleSale.findAll({
            where: whereClause,
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "callAgent"},
                {model: User, as: "salesUser"},
            ],
            order: [["createdAt", "DESC"]],
        });

        res.status(http.OK).json({
            message: "Vehicle sales fetched successfully by status",
            sales,
        });
    } catch (error) {
        console.error("Error fetching vehicle sales by status:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getNearestRemindersBySalesUser = async (req: Request, res: Response) => {
    try {
        const {userId} = req.params;

        if (!userId) {
            return res.status(400).json({message: "User ID is required"});
        }

        const salesWithReminders = await VehicleSale.findAll({
            where: {assigned_sales_id: userId},
            include: [
                {
                    model: VehicleSaleReminder,
                    as: "reminders",
                    where: {
                        task_date: {
                            [Op.gte]: new Date(),
                        },
                    },
                    required: true,
                    order: [["task_date", "ASC"]],
                },
                {
                    model: Customer,
                    as: "customer",
                    attributes: ["customer_name", "phone_number", "email"],
                },
            ],
            order: [[{model: VehicleSaleReminder, as: "reminders"}, "task_date", "ASC"]],
        });

        const nearestReminders = salesWithReminders.flatMap((sale: any) =>
            sale.reminders.map((reminder: any) => ({
                reminder_id: reminder.id,
                task_title: reminder.task_title,
                task_date: reminder.task_date,
                note: reminder.note,
                sale_id: sale.id,
                ticket_number: sale.ticket_number,
                customer_name: sale.customer?.customer_name,
                contact_number: sale.customer?.phone_number,
            }))
        );

        nearestReminders.sort(
            (a, b) => new Date(a.task_date).getTime() - new Date(b.task_date).getTime()
        );

        return res.status(200).json({data: nearestReminders});
    } catch (error: any) {
        console.error("getNearestRemindersBySalesUser error:", error);
        return res
            .status(500)
            .json({message: "Internal server error", error: error.message});
    }
};

export const updatePriority = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {priority} = req.body;

        if (priority === undefined || isNaN(priority)) {
            return res.status(400).json({message: "Valid priority is required"});
        }

        const sale = await VehicleSale.findByPk(id);

        if (!sale) {
            return res.status(404).json({message: "Sale not found"});
        }

        sale.priority = priority;
        await sale.save();

        return res.status(200).json({message: "Priority updated", sale});
    } catch (err) {
        console.error("updatePriority error:", err);
        res.status(500).json({message: "Server error"});
    }
};