import {Request, Response} from "express";
import db from "../models";

const {VehicleSaleFollowup, VehicleSale} = db;

export const createFollowUp = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const followup = await VehicleSaleFollowup.create(data);
        res.status(201).json({message: "Follow-up created", followup});
    } catch (error) {
        console.error("Error creating follow-up:", error);
        res.status(500).json({message: "Server error"});
    }
};

export const getFollowUpsBySaleId = async (req: Request, res: Response) => {
    try {
        const {vehicleSaleId} = req.params;
        const followups = await VehicleSaleFollowup.findAll({
            where: {vehicleSaleId},
        });
        res.json(followups);
    } catch (error) {
        console.error("Error fetching follow-ups:", error);
        res.status(500).json({message: "Server error"});
    }
};

export const getFollowUpsByTicket = async (req: Request, res: Response) => {
    try {
        const {ticketNumber} = req.params;

        const sale = await VehicleSale.findOne({where: {ticket_number: ticketNumber}});

        if (!sale) {
            return res.status(404).json({message: "Vehicle sale not found for this ticket"});
        }

        const followups = await VehicleSaleFollowup.findAll({
            where: {vehicleSaleId: sale.id},
            order: [["activity_date", "DESC"]],
        });

        res.json(followups);
    } catch (error) {
        console.error("Error fetching follow-ups by ticket:", error);
        res.status(500).json({message: "Server error"});
    }
};


export const deleteFollowUp = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const followup = await VehicleSaleFollowup.findByPk(id);
        if (!followup) return res.status(404).json({message: "Follow-up not found"});
        await followup.destroy();
        res.json({message: "Follow-up deleted"});
    } catch (error) {
        console.error("Error deleting follow-up:", error);
        res.status(500).json({message: "Server error"});
    }
};
