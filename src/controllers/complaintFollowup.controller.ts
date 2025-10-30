import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";

const {ComplaintFollowUp, Complaint} = db;

export const createFollowUp = async (req: Request, res: Response) => {
    try {
        const {activity, activity_date, complaintId} = req.body;

        const complaint = await Complaint.findByPk(complaintId);
        if (!complaint)
            return res.status(http.NOT_FOUND).json({message: "Complaint not found"});

        const followUp = await ComplaintFollowUp.create({activity, activity_date, complaintId});

        res.status(http.CREATED).json({
            message: "Follow-up created successfully",
            followUp,
        });
    } catch (error) {
        console.error("Error creating follow-up:", error);
        res
            .status(http.INTERNAL_SERVER_ERROR)
            .json({message: "Internal server error"});
    }
};


export const getAllFollowUps = async (req: Request, res: Response) => {
    try {
        const followups = await ComplaintFollowUp.findAll({
            include: [{model: Complaint, as: "complaint"}],
            order: [["createdAt", "DESC"]],
        });
        res.status(http.OK).json(followups);
    } catch (error) {
        console.error("Error fetching follow-ups:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};


export const getFollowUpsByComplaint = async (req: Request, res: Response) => {
    try {
        const {complaintId} = req.params;

        const followups = await ComplaintFollowUp.findAll({where: {complaintId}});
        res.status(http.OK).json(followups);
    } catch (error) {
        console.error("Error fetching follow-ups:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};

export const updateFollowUp = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {activity, activity_date} = req.body;

        const followUp = await ComplaintFollowUp.findByPk(id);
        if (!followUp) return res.status(http.NOT_FOUND).json({message: "Follow-up not found"});

        await followUp.update({activity, activity_date});
        res.json({message: "Follow-up updated successfully", followUp});
    } catch (error) {
        console.error("Error updating follow-up:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};

export const deleteFollowUp = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;

        const followUp = await ComplaintFollowUp.findByPk(id);
        if (!followUp) return res.status(http.NOT_FOUND).json({message: "Follow-up not found"});

        await followUp.destroy();
        res.json({message: "Follow-up deleted successfully"});
    } catch (error) {
        console.error("Error deleting follow-up:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};
