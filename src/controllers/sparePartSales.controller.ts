import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";

const {SparePartSale, SparePartSaleFollowup, SparePartSaleReminder, Customer, User} = db;

export const createSale = async (req: Request, res: Response) => {
    try {
        const {
            date,
            customer_id,
            call_agent_id,
            vehicle_make,
            vehicle_model,
            part_no,
            year_of_manufacture,
            additional_note,
        } = req.body;

        const sale = await SparePartSale.create({
            ticket_number: `IMS${Date.now()}`,
            date,
            customer_id,
            call_agent_id,
            vehicle_make,
            vehicle_model,
            part_no,
            year_of_manufacture,
            additional_note,
        });

        res.status(http.CREATED).json({message: "Sale created", sale});
    } catch (err) {
        console.error("createSale error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const listSales = async (req: Request, res: Response) => {
    try {
        const {status, assigned_sales_id, call_agent_id} = req.query;
        const where: any = {};
        if (status) where.status = String(status).toUpperCase();
        if (assigned_sales_id) where.assigned_sales_id = Number(assigned_sales_id);
        if (call_agent_id) where.call_agent_id = Number(call_agent_id);

        const sales = await SparePartSale.findAll({
            where,
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "callAgent", attributes: ["id", "full_name", "contact_no", "email"]},
                {model: User, as: "salesUser", attributes: ["id", "full_name", "contact_no", "email"]},
            ],
            order: [["createdAt", "DESC"]],
        });
        res.status(http.OK).json(sales);
    } catch (err) {
        console.error("listSales error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getSaleByTicket = async (req: Request, res: Response) => {
    try {
        const {ticket} = req.params;
        const sale = await SparePartSale.findOne({
            where: {ticket_number: ticket},
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "callAgent", attributes: ["id", "full_name"]},
                {model: User, as: "salesUser", attributes: ["id", "full_name"]},
                {model: SparePartSaleFollowup, as: "followups", order: [["activity_date", "DESC"]]},
                {model: SparePartSaleReminder, as: "reminders", order: [["task_date", "ASC"]]}
            ],
        });
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});
        res.status(http.OK).json(sale);
    } catch (err) {
        console.error("getSaleByTicket error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const assignToSales = async (req: Request, res: Response) => {
    try {
        const {id} = req.params; // sale id
        const {salesUserId} = req.body;

        const sale = await SparePartSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.assigned_sales_id = salesUserId;
        sale.status = "NEW"; // remain new until salesman clicks "assign to me"
        await sale.save();
        res.status(http.OK).json({message: "Assigned", sale});
    } catch (err) {
        console.error("assignToSales error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const assignToMe = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {userId} = req.body;

        const sale = await SparePartSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.assigned_sales_id = userId;
        sale.status = "ONGOING";
        await sale.save();
        res.status(http.OK).json({message: "Sale claimed", sale});
    } catch (err) {
        console.error("assignToMe error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const updateSaleStatus = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {status} = req.body;

        if (!["WON", "LOST"].includes(status)) {
            return res.status(http.BAD_REQUEST).json({
                message: "Invalid status. Only 'WON' or 'LOST' are allowed.",
            });
        }

        const sale = await SparePartSale.findByPk(id);
        if (!sale) {
            return res.status(http.NOT_FOUND).json({message: "Sale not found"});
        }

        if (sale.status !== "ONGOING") {
            return res.status(http.BAD_REQUEST).json({
                message: `Cannot update status. Current status is '${sale.status}'. Only 'ONGOING' sales can be marked as 'WON' or 'LOST'.`,
            });
        }

        sale.status = status;
        await sale.save();

        return res.status(http.OK).json({
            message: `Sale status updated to ${status}`,
            sale,
        });
    } catch (err) {
        console.error("updateSaleStatus error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const createFollowup = async (req: Request, res: Response) => {
    try {
        const {activity, activity_date, spare_part_sale_id} = req.body;
        const sale = await SparePartSale.findByPk(spare_part_sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const f = await SparePartSaleFollowup.create({activity, activity_date, spare_part_sale_id});
        res.status(http.CREATED).json({message: "Followup created", followup: f});
    } catch (err) {
        console.error("createFollowup error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const createReminder = async (req: Request, res: Response) => {
    try {
        const {task_title, task_date, note, spare_part_sale_id} = req.body;
        const sale = await SparePartSale.findByPk(spare_part_sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const reminder = await SparePartSaleReminder.create({task_title, task_date, note, spare_part_sale_id});
        res.status(http.CREATED).json({message: "Reminder created", reminder: reminder});
    } catch (err) {
        console.error("createReminder error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const getFollowupsByTicket = async (req: Request, res: Response) => {
    try {
        const {ticket} = req.params;
        const sale = await SparePartSale.findOne({where: {ticket_number: ticket}});
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const followups = await SparePartSaleFollowup.findAll({
            where: {spare_part_sale_id: sale.id},
            order: [["activity_date", "DESC"]],
        });
        res.status(http.OK).json(followups);
    } catch (err) {
        console.error("getFollowupsByTicket error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getRemindersByTicket = async (req: Request, res: Response) => {
    try {
        const {ticket} = req.params;
        const sale = await SparePartSale.findOne({where: {ticket_number: ticket}});
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const reminders = await SparePartSaleReminder.findAll({
            where: {spare_part_sale_id: sale.id},
            order: [["task_date", "ASC"]],
        });
        res.status(http.OK).json(reminders);
    } catch (err) {
        console.error("getRemindersByTicket error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};