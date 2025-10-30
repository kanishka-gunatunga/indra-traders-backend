import {Request, Response} from "express";
import db from "../models";

const {VehicleSaleReminder, VehicleSale} = db;


export const createReminder = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const reminder = await VehicleSaleReminder.create(data);
        res.status(201).json({message: "Reminder created", reminder});
    } catch (error) {
        console.error("Error creating reminder:", error);
        res.status(500).json({message: "Server error"});
    }
};


export const getRemindersBySaleId = async (req: Request, res: Response) => {
    try {
        const {vehicleSaleId} = req.params;
        const reminders = await VehicleSaleReminder.findAll({where: {vehicleSaleId}});
        res.json(reminders);
    } catch (error) {
        console.error("Error fetching reminders:", error);
        res.status(500).json({message: "Server error"});
    }
};


export const getRemindersByTicket = async (req: Request, res: Response) => {
    try {
        const {ticketNumber} = req.params;

        const sale = await VehicleSale.findOne({where: {ticket_number: ticketNumber}});
        if (!sale) {
            return res.status(404).json({message: "Vehicle sale not found for this ticket"});
        }

        const reminders = await VehicleSaleReminder.findAll({
            where: {vehicleSaleId: sale.id},
            order: [["task_date", "ASC"]],
        });

        res.json(reminders);
    } catch (error) {
        console.error("Error fetching reminders by ticket:", error);
        res.status(500).json({message: "Server error"});
    }
};


export const deleteReminder = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const reminder = await VehicleSaleReminder.findByPk(id);
        if (!reminder) return res.status(404).json({message: "Reminder not found"});
        await reminder.destroy();
        res.json({message: "Reminder deleted"});
    } catch (error) {
        console.error("Error deleting reminder:", error);
        res.status(500).json({message: "Server error"});
    }
};
