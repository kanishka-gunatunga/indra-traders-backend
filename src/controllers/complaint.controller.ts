import { Request, Response } from "express";
import db from "../models";
import http from "http-status-codes";
import { Op } from "sequelize";

const { Complaint, Customer, ComplaintFollowUp, ComplaintReminder, User } = db;

export const createComplaint = async (req: Request, res: Response) => {
    try {
        const {
            category,
            customer_name,
            phone_number,
            email,
            vehicle_number,
            title,
            preferred_solution,
            description,
        } = req.body;

        let customer = await Customer.findOne({ where: { phone_number } });

        if (!customer) {
            customer = await Customer.create({
                id: `CUS${Date.now()}`,
                customer_name,
                phone_number,
                email,
                vehicle_number,
            });
        }

        const ticket_no = `T${Date.now()}`;

        const complaint = await Complaint.create({
            ticket_no,
            category,
            title,
            preferred_solution,
            description,
            contact_no: phone_number,
            vehicle_no: vehicle_number,
            customerId: customer.id,
        });

        return res.status(http.CREATED).json({
            message: "Complaint created successfully",
            complaint,
        });
    } catch (error) {
        console.error("Error creating complaint:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
};


export const getAllComplaints = async (req: Request, res: Response) => {
    try {
        const { search } = req.query;
        let where: any = {};

        if (search) {
            where = {
                [Op.or]: [
                    { vehicle_no: { [Op.like]: `%${search}%` } },
                    { ticket_no: { [Op.like]: `%${search}%` } },
                    { category: { [Op.like]: `%${search}%` } },
                    { contact_no: { [Op.like]: `%${search}%` } },
                ]
            };
        }

        const complaints = await Complaint.findAll({
            where,
            include: [{ model: Customer, as: "customer" }],
            order: [["createdAt", "DESC"]],
        });
        res.status(http.OK).json(complaints);
    } catch (error) {
        console.error("Error fetching complaints:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
};


export const getComplaintById = async (req: Request, res: Response) => {
    try {
        const complaint = await Complaint.findByPk(req.params.id, {
            include: [
                { model: Customer, as: "customer" },
                {
                    model: ComplaintFollowUp, as: "followups",
                    include: [
                        { model: User, as: "creator", attributes: ["full_name", "user_role"] }
                    ]
                },
                {
                    model: ComplaintReminder, as: "reminders",
                    include: [
                        { model: User, as: "creator", attributes: ["full_name", "user_role"] }
                    ]
                },
            ],
        });

        if (!complaint) {
            return res.status(http.NOT_FOUND).json({ message: "Complaint not found" });
        }

        res.status(http.OK).json(complaint);
    } catch (error) {
        console.error("Error fetching complaint:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
};


export const getComplaintsByContact = async (req: Request, res: Response) => {
    try {
        const { phone_number } = req.params;

        const complaints = await Complaint.findAll({
            where: { contact_no: phone_number },
            include: [{ model: Customer, as: "customer" }],
        });

        res.status(http.OK).json(complaints);
    } catch (error) {
        console.error("Error fetching complaints:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
};

export const updateComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, progress, comment } = req.body;

        const complaint = await Complaint.findByPk(id);
        if (!complaint) return res.status(http.NOT_FOUND).json({ message: "Not found" });

        await complaint.update({ status, progress, comment });

        res.status(http.OK).json({ message: "Complaint updated successfully", complaint });
    } catch (error) {
        console.error("Error updating complaint:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
};



