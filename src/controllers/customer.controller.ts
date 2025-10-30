import {Request, Response} from "express";
import db from "../models";

const {Customer, Complaint} = db;

export const getCustomers = async (req: Request, res: Response) => {
    try {
        const customers = await Customer.findAll({
            include: [{model: Complaint, as: "complaints"}],
        });
        res.status(200).json(customers);
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({message: "Internal server error"});
    }
};

export const updateCustomer = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const updates = req.body;
        const customer = await Customer.findByPk(id);

        if (!customer) {
            return res.status(404).json({message: "Customer not found"});
        }

        await customer.update(updates);
        res.status(200).json({message: "Customer updated", customer});
    } catch (error) {
        console.error("Error updating customer:", error);
        res.status(500).json({message: "Internal server error"});
    }
};
