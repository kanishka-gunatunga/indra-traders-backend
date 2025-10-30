import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";

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