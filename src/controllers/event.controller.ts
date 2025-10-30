import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";

const {Event, Customer} = db;

export const createEvent = async (req: Request, res: Response) => {
    try {
        const {title, date, customerId} = req.body;

        const event = await Event.create({
            id: `EVT${Date.now()}`,
            title,
            date,
            customerId: customerId || null,
        });

        res.status(http.CREATED).json({message: "Event created successfully", event});
    } catch (error) {
        console.error("Error creating event:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};


export const getEvents = async (req: Request, res: Response) => {
    try {
        const events = await Event.findAll({
            include: [{model: Customer, as: "customer"}],
            order: [["date", "DESC"]],
        });
        res.status(http.OK).json(events);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};

export const getEventById = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const event = await Event.findByPk(id, {
            include: [{model: Customer, as: "customer"}],
        });

        if (!event) {
            return res.status(http.NOT_FOUND).json({message: "Event not found"});
        }

        res.status(http.OK).json(event);
    } catch (error) {
        console.error("Error fetching event:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};


export const getEventsByCustomerId = async (req: Request, res: Response) => {
    try {
        const {customerId} = req.params;

        if (!customerId) {
            return res.status(http.BAD_REQUEST).json({message: "Customer ID is required"});
        }

        const events = await Event.findAll({
            where: {customerId},
            include: [
                {
                    model: Customer,
                    as: "customer",
                    attributes: ["id", "customer_name", "email", "phone_number"],
                },
            ],
            order: [["date", "DESC"]],
        });

        if (!events || events.length === 0) {
            return res.status(http.NOT_FOUND).json({message: "No events found for this customer"});
        }
        res.status(http.OK).json(events);
    } catch (error) {
        console.error("Error fetching events by customer ID:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};

export const updateEvent = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const updates = req.body;

        const event = await Event.findByPk(id);
        if (!event) return res.status(http.NOT_FOUND).json({message: "Event not found"});

        await event.update(updates);
        res.status(http.NOT_FOUND).json({message: "Event updated successfully", event});
    } catch (error) {
        console.error("Error updating event:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const event = await Event.findByPk(id);
        if (!event) return res.status(http.NOT_FOUND).json({message: "Event not found"});

        await event.destroy();
        res.status(http.OK).json({message: "Event deleted successfully"});
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};
