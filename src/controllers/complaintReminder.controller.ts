import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";

const {ComplaintReminder, Complaint} = db;


export const createReminder = async (req: Request, res: Response) => {
    try {
        const {task_title, task_date, note, complaintId} = req.body;

        const complaint = await Complaint.findByPk(complaintId);
        if (!complaint)
            return res.status(http.NOT_FOUND).json({message: "Complaint not found"});

        const reminder = await ComplaintReminder.create({
            task_title,
            task_date,
            note,
            complaintId,
        });

        res.status(http.CREATED).json({
            message: "Reminder created successfully",
            reminder,
        });
    } catch (error) {
        console.error("Error creating reminder:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};


export const getAllReminders = async (req: Request, res: Response) => {
    try {
        const reminders = await ComplaintReminder.findAll({
            include: [{model: Complaint, as: "complaint"}],
            order: [["createdAt", "DESC"]],
        });
        res.status(http.OK).json(reminders);
    } catch (error) {
        console.error("Error fetching reminders:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};


export const getRemindersByComplaint = async (req: Request, res: Response) => {
    try {
        const {complaintId} = req.params;
        const reminders = await ComplaintReminder.findAll({where: {complaintId}});

        res.status(http.OK).json(reminders);
    } catch (error) {
        console.error("Error fetching reminders:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};


export const updateReminder = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {task_title, task_date, note} = req.body;

        const reminder = await ComplaintReminder.findByPk(id);
        if (!reminder) return res.status(http.NOT_FOUND).json({message: "Reminder not found"});

        await reminder.update({task_title, task_date, note});
        res.json({message: "Reminder updated successfully", reminder});
    } catch (error) {
        console.error("Error updating reminder:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};


export const deleteReminder = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;

        const reminder = await ComplaintReminder.findByPk(id);
        if (!reminder) return res.status(http.NOT_FOUND).json({message: "Reminder not found"});

        await reminder.destroy();
        res.json({message: "Reminder deleted successfully"});
    } catch (error) {
        console.error("Error deleting reminder:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};
