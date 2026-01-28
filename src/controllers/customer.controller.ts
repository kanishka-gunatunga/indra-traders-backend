import { Request, Response } from "express";
import db from "../models";

const { Customer, Complaint } = db;

import { Op } from "sequelize";

export const getCustomers = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search, type, source, branch } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause: any = {};

        if (search) {
            whereClause[Op.or] = [
                { customer_name: { [Op.like]: `%${search}%` } },
                { phone_number: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { vehicle_number: { [Op.like]: `%${search}%` } },
            ];
        }

        if (type) {
            whereClause.customer_type = Array.isArray(type) ? { [Op.in]: type } : type;
        }

        if (source) {
            whereClause.lead_source = Array.isArray(source) ? { [Op.in]: source } : source;
        }

        if (branch) {
            whereClause.convenient_branch = Array.isArray(branch) ? { [Op.in]: branch } : branch;
        }

        const { count, rows } = await Customer.findAndCountAll({
            where: whereClause,
            limit: Number(limit),
            offset: Number(offset),
            order: [["createdAt", "DESC"]],
            // include: [{ model: Complaint, as: "complaints" }], // Optional: Include if needed, maybe expensive for table view
        });

        res.status(200).json({
            data: rows,
            meta: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / Number(limit)),
            },
        });
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateCustomer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const customer = await Customer.findByPk(id);

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        await customer.update(updates);
        res.status(200).json({ message: "Customer updated", customer });
    } catch (error) {
        console.error("Error updating customer:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
