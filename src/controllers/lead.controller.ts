import { Request, Response } from "express";
import http from "http-status-codes";
import db from "../models";

import { logActivity } from "../services/logActivity";
import { sendNotification } from "../services/notification";

const {
    VehicleSale,
    FastTrackSale,
    SparePartSale,
    ServiceParkSale,
    BydSale,
    Customer,
    User,
    VehicleSaleHistory,
    FastTrackSaleHistory,
    SparePartSaleHistory,
    ServiceParkSaleHistory,
    BydSaleHistory
} = db;
import { Op } from "sequelize";

interface Lead {
    id: string; // Composite ID or stringified ID
    original_id: number;
    ticket_number: string;
    priority: number;
    user: string; // Customer name or ID
    phone: string;
    date: string;
    status: string;
    type: 'VEHICLE' | 'FAST_TRACK' | 'SPARE_PART' | 'SERVICE_PARK' | 'BYD';
}

export const getAllLeads = async (req: Request, res: Response) => {
    try {
        const commonInclude = [
            { model: Customer, as: "customer" },
            { model: User, as: "salesUser" },
            { model: User, as: "callAgent" },
        ];

        const serviceParkInclude = [
            { model: Customer, as: "customer" },
            { model: User, as: "salesUser" },
        ];

        const safeFindAll = async (model: any, options: any, name: string) => {
            try {
                return await model.findAll(options);
            } catch (err: any) {
                console.error(`Error fetching ${name}:`, err.message);
                return [];
            }
        };

        const [vehicleSales, fastTrackSales, sparePartSales, serviceParkSales, bydSales] = await Promise.all([
            safeFindAll(VehicleSale, { include: commonInclude, order: [["createdAt", "DESC"]] }, "VehicleSale"),
            safeFindAll(FastTrackSale, { include: commonInclude, order: [["createdAt", "DESC"]] }, "FastTrackSale"),
            safeFindAll(SparePartSale, { include: commonInclude, order: [["createdAt", "DESC"]] }, "SparePartSale"),
            safeFindAll(ServiceParkSale, { include: serviceParkInclude, order: [["createdAt", "DESC"]] }, "ServiceParkSale"),
            safeFindAll(BydSale, { include: commonInclude, order: [["createdAt", "DESC"]] }, "BydSale")
        ]);

        const formatLead = (sale: any, type: Lead['type']): Lead => {
            // Handle case where customer might be an object (if joined) or just an ID string (if data integrity issue)
            // Based on include, it should be an object in 'customer' field.
            // However, types in existing models say customer_id is string.
            // If joined, sale.customer will be populated.

            const customerName = sale.customer?.customer_name || sale.customer_id || "Unknown Customer";
            const customerPhone = sale.customer?.phone_number || "";

            // Map status directly
            // Note: Use simple status mapping or capitalize
            const status = (sale.status || "NEW").charAt(0).toUpperCase() + (sale.status || "NEW").slice(1).toLowerCase();

            return {
                id: `${type}_${sale.id}`,
                original_id: sale.id,
                ticket_number: sale.ticket_number || `UNK-${sale.id}`,
                priority: sale.priority || 0,
                user: customerName,
                phone: customerPhone,
                date: sale.date ? new Date(sale.date).toDateString() : new Date(sale.createdAt).toDateString(),
                status: status,
                type: type
            };
        };

        const allLeads: Lead[] = [
            ...vehicleSales.map((s: any) => formatLead(s, 'VEHICLE')),
            ...fastTrackSales.map((s: any) => formatLead(s, 'FAST_TRACK')),
            ...sparePartSales.map((s: any) => formatLead(s, 'SPARE_PART')),
            ...serviceParkSales.map((s: any) => formatLead(s, 'SERVICE_PARK')),
            ...bydSales.map((s: any) => formatLead(s, 'BYD')),
        ];

        // Sort combined list by date desc if needed, assuming they want latest first
        // Since we date format is string above, we might want to keep robust sorting.
        // But for Kanban, maybe they are sorted by status? 
        // The requirement just said "get all leads". 
        // Let's sort by createdAt desc roughly to match individual queries
        // But we lost raw date in map. Let's rely on frontend or just simplistic concat for now.
        // Actually, let's just return them.

        res.status(http.OK).json(allLeads);

    } catch (error: any) {
        console.error("Error fetching all leads:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching leads",
            error: error.message
        });
    }
};

export const getEligibleSalesAgents = async (req: Request, res: Response) => {
    try {
        const { department, branch, level } = req.query;

        const where: any = {};

        if (level) {
            const roleMap: any = {
                1: "SALES01",
                2: "SALES02",
                3: "SALES03"
            };
            const role = roleMap[Number(level)];
            if (role) {
                where.user_role = role;
            } else {
                // Fallback or ignore if invalid level? 
                // If invalid level, maybe return empty or just ignore. 
                // Let's stick to base logic: if level is not passed, use all.
                // If level IS passed but invalid, technically it shouldn't match anything?
                // Or maybe the user meant "if level is passed, enforce it".
                // But for safety let's just default to the existing list if no specific level matched?
                // Actually the requirement is "sale level agent should be same to lead current level".
                // So if level 1, only SALES01.
                where.user_role = {
                    [Op.in]: ["SALES01", "SALES02", "SALES03"]
                }
            }
        } else {
            where.user_role = {
                [Op.in]: ["SALES01", "SALES02", "SALES03"]
            }
        }

        if (department) {
            where.department = department;
        }

        if (branch) {
            where.branch = branch;
        }

        const agents = await User.findAll({
            where,
            attributes: ["id", "full_name", "user_role", "department", "branch", "contact_no"] // Return necessary info
        });

        res.status(http.OK).json(agents);
    } catch (error: any) {
        console.error("Error fetching sales agents:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching sales agents",
            error: error.message
        });
    }
};

export const assignLead = async (req: Request, res: Response) => {
    try {
        const { leadType, leadId, salesUserId } = req.body;

        console.log("--------------- ASSIGN LEAD REQUEST ---------------");
        console.log("Body:", req.body);
        console.log(`Type: ${leadType}, LeadID: ${leadId}, SalesUserID: ${salesUserId}`);

        if (!leadType || !leadId || !salesUserId) {
            console.log("Missing required fields");
            return res.status(http.BAD_REQUEST).json({ message: "Missing required fields" });
        }

        const salesUserIdInt = Number(salesUserId);
        if (isNaN(salesUserIdInt)) {
            console.log("Invalid Sales User ID");
            return res.status(http.BAD_REQUEST).json({ message: "Invalid Sales User ID" });
        }

        let model: any;
        switch (leadType) {
            case 'VEHICLE':
                model = VehicleSale;
                break;
            case 'FAST_TRACK':
                model = FastTrackSale;
                break;
            case 'SPARE_PART':
                model = SparePartSale;
                break;
            case 'SERVICE_PARK':
                model = ServiceParkSale;
                break;
            case 'BYD':
                model = BydSale;
                break;
            default:
                return res.status(http.BAD_REQUEST).json({ message: "Invalid lead type" });
        }

        const lead = await model.findByPk(leadId);

        if (!lead) {
            return res.status(http.NOT_FOUND).json({ message: "Lead not found" });
        }

        const updateData: any = {};

        if (leadType === 'SERVICE_PARK') {
            updateData.sales_user_id = salesUserIdInt;
        } else {
            updateData.assigned_sales_id = salesUserIdInt;
        }

        console.log("Update Data:", updateData);

        // If status is NEW, update to ONGOING
        const currentStatus = (lead.status || "").toUpperCase();
        if (currentStatus === "NEW") {
            updateData.status = "ONGOING";
        }

        const updated = await lead.update(updateData);
        console.log("Lead Updated Result:", updated);

        // Fetch assigned user details for response if needed
        const assignedUser = await User.findByPk(salesUserId, { attributes: ['full_name'] });

        // --- History, Logging, Notification ---
        const loggedInUserId = (req as any).user?.id || req.body.adminId || null;

        if (!loggedInUserId) {
            console.warn("Logged in user ID (Action By) is missing for History/Log!");
        }

        let historyModel: any = null;
        let historyForeignKey: string = "";
        let activityModule: any = "";
        let notificationRefModule: string = "";

        switch (leadType) {
            case 'VEHICLE':
                historyModel = VehicleSaleHistory;
                historyForeignKey = 'vehicle_sale_id';
                activityModule = 'VEHICLE';
                notificationRefModule = 'VEHICLE_SALE';
                break;
            case 'FAST_TRACK':
                historyModel = FastTrackSaleHistory;
                historyForeignKey = 'fast_track_sale_id';
                activityModule = 'FAST_TRACK';
                notificationRefModule = 'FAST_TRACK_SALE';
                break;
            case 'SPARE_PART':
                historyModel = SparePartSaleHistory;
                historyForeignKey = 'spare_part_sale_id';
                activityModule = 'SPARE_PARTS';
                notificationRefModule = 'SPARE_PART_SALE';
                break;
            case 'SERVICE_PARK':
                historyModel = ServiceParkSaleHistory;
                historyForeignKey = 'service_park_sale_id';
                activityModule = 'SERVICE_PARK';
                notificationRefModule = 'SERVICE_PARK_SALE';
                break;
            case 'BYD':
                historyModel = BydSaleHistory;
                historyForeignKey = 'byd_sale_id';
                activityModule = 'BYD_SALES';
                notificationRefModule = 'BYD_SALE';
                break;
        }

        try {
            // 1. Create History Record
            if (historyModel && loggedInUserId) {
                await historyModel.create({
                    [historyForeignKey]: lead.id,
                    action_by: loggedInUserId,
                    action_type: "ASSIGNED",
                    details: `Lead assigned to ${assignedUser?.full_name || 'Sales Agent'}`,
                    previous_level: lead.current_level,
                    new_level: lead.current_level,
                    timestamp: new Date()
                });
            }

            // 2. Log Activity
            if (loggedInUserId) {
                await logActivity({
                    userId: loggedInUserId,
                    module: activityModule,
                    actionType: "ASSIGN",
                    entityId: lead.id,
                    description: `Assigned lead ${lead.ticket_number} to ${assignedUser?.full_name}`,
                    changes: updateData
                });
            }

            // 3. Send Notification
            // Ensure we are notifying the NEW agent
            await sendNotification({
                userId: salesUserIdInt,
                title: "New Lead Assigned",
                message: `You have been assigned a new ${leadType} lead: ${lead.ticket_number}`,
                type: "ASSIGNMENT",
                referenceId: lead.id,
                referenceModule: notificationRefModule
            });

        } catch (postUpdateError) {
            console.error("Error processing post-assignment actions (History/Log/Notif):", postUpdateError);
            // Don't fail the request if these fail, just log it
        }

        res.status(http.OK).json({
            message: "Lead assigned successfully",
            leadId: lead.id,
            assignedTo: assignedUser?.full_name,
            status: updateData.status || lead.status
        });

    } catch (error: any) {
        console.error("Error assigning lead:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error assigning lead",
            error: error.message
        });
    }
};
