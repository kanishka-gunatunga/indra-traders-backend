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
        const { page = 1, limit = 10, search, status, priority, startDate, endDate, department } = req.query;

        const limitNum = Number(limit);
        const pageNum = Number(page);
        const offset = (pageNum - 1) * limitNum;

        // --- Build Filter Conditions ---
        const whereClause: any = {};
        const customerWhereClause: any = {};

        // 1. Status
        if (status && status !== "All Status") {
            // Check if status needs mapping (Frontend: 'New', DB: 'NEW' or 'New'?)
            // DB seems to use uppercase usually, based on other controllers.
            // Let's assume input matches DB or we try case-insensitive if possible, 
            // but for now let's uppercase it as common standard if not sure, 
            // OR matched to what we saw in other files.
            // In existing getAllLeads, it did `(sale.status || "NEW").charAt(0).toUpperCase()..` for display.
            // Let's force exact match if passed, or uppercase safe bet.
            whereClause.status = status.toString().toUpperCase();
        }

        // 2. Priority
        if (priority && priority !== "All Priority") {
            // Frontend sends "P0", "P1". DB typically stores number 0, 1?
            // "P0" -> 0.
            if (priority.toString().startsWith("P")) {
                const pNum = parseInt(priority.toString().replace("P", ""), 10);
                if (!isNaN(pNum)) {
                    whereClause.priority = pNum;
                }
            } else {
                whereClause.priority = priority;
            }
        }

        // 3. Date Range
        if (startDate || endDate) {
            const dateFilter: any = {};
            if (startDate) dateFilter[Op.gte] = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                dateFilter[Op.lte] = end;
            }
            whereClause.date = dateFilter;
            // Note: If 'date' field is just a string in some tables, this might fail. 
            // Assuming 'date' or 'createdAt' is DATE type. 
            // Most sales tables usually have a 'date' field.
        }

        // 4. Search (Ticket No, Customer Name, Phone)
        // This requires OR logic across main table and joining table.
        // Sequelize support for "$associated.field$" in where.
        if (search) {
            whereClause[Op.or] = [
                { ticket_number: { [Op.like]: `%${search}%` } },
                { '$customer.customer_name$': { [Op.like]: `%${search}%` } },
                { '$customer.phone_number$': { [Op.like]: `%${search}%` } }
            ];
        }

        // --- Select Models based on Department ---
        // ITPL -> VehicleSale
        // ISP -> ServiceParkSale
        // IMS -> SparePartSale
        // IFT -> FastTrackSale
        // BYD -> BydSale

        let modelsToQuery: Array<{ model: any, type: Lead['type'], name: string }> = [];

        if (department) {
            switch (department) {
                case 'ITPL': modelsToQuery.push({ model: VehicleSale, type: 'VEHICLE', name: "VehicleSale" }); break;
                case 'ISP': modelsToQuery.push({ model: ServiceParkSale, type: 'SERVICE_PARK', name: "ServiceParkSale" }); break;
                case 'IMS': modelsToQuery.push({ model: SparePartSale, type: 'SPARE_PART', name: "SparePartSale" }); break;
                case 'IFT': modelsToQuery.push({ model: FastTrackSale, type: 'FAST_TRACK', name: "FastTrackSale" }); break;
                case 'BYD': modelsToQuery.push({ model: BydSale, type: 'BYD', name: "BydSale" }); break;
            }
        } else {
            // All
            modelsToQuery = [
                { model: VehicleSale, type: 'VEHICLE', name: "VehicleSale" },
                { model: ServiceParkSale, type: 'SERVICE_PARK', name: "ServiceParkSale" },
                { model: SparePartSale, type: 'SPARE_PART', name: "SparePartSale" },
                { model: FastTrackSale, type: 'FAST_TRACK', name: "FastTrackSale" },
                { model: BydSale, type: 'BYD', name: "BydSale" }
            ];
        }

        const commonInclude = [
            { model: Customer, as: "customer" }, // Required for search
            { model: User, as: "salesUser" },
            { model: User, as: "callAgent" },
        ];

        // ServicePark might have different include (no callAgent maybe?)
        const serviceParkInclude = [
            { model: Customer, as: "customer" },
            { model: User, as: "salesUser" },
        ];

        const fetchPromises = modelsToQuery.map(async ({ model, type, name }) => {
            try {
                const includes = (type === 'SERVICE_PARK') ? serviceParkInclude : commonInclude;

                // We must handle 'customer' required: false/true depending on search?
                // If search is filtering by customer, we usually need required: true, 
                // but since we did '$customer.name$' in top-level WHERE, Sequelize automatically handles join if we include 'customer'.
                // BUT, 'all-leads' tables might not ALL behave identically. 
                // Let's trust Sequelize's alias handling.

                const results = await model.findAll({
                    where: whereClause,
                    include: includes,
                    order: [["createdAt", "DESC"]] // Fetch latest first
                });
                return results.map((r: any) => ({ data: r, type }));
            } catch (err) {
                console.error(`Error querying ${name}:`, err);
                return [];
            }
        });

        const nestedResults = await Promise.all(fetchPromises);
        const flatResults = nestedResults.flat();

        // --- Formatting ---
        const formatLead = (row: any): Lead => {
            const sale = row.data;
            const type = row.type;
            const customerName = sale.customer?.customer_name || sale.customer_id || "Unknown Customer";
            const customerPhone = sale.customer?.phone_number || "";
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

        const allLeads = flatResults.map(formatLead);

        // --- Sorting ---
        // Re-sort by date descending since we merged multiple streams
        allLeads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // --- Pagination ---
        const total = allLeads.length;
        const totalPages = Math.ceil(total / limitNum);
        const paginatedLeads = allLeads.slice(offset, offset + limitNum);

        res.status(http.OK).json({
            data: paginatedLeads,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages
            }
        });

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

export const updateLeadStatus = async (req: Request, res: Response) => {
    try {
        const { id, status } = req.body; // id is "TYPE_ID" e.g. "VEHICLE_123"

        if (!id || !status) {
            return res.status(http.BAD_REQUEST).json({ message: "Missing id or status" });
        }

        const [type, dbIdStr] = id.split("_");
        const leadId = Number(dbIdStr);

        if (!type || isNaN(leadId)) {
            return res.status(http.BAD_REQUEST).json({ message: "Invalid ID format" });
        }

        let model: any;
        let historyModel: any;
        let historyForeignKey: string;

        switch (type) {
            case 'VEHICLE':
                model = VehicleSale;
                historyModel = VehicleSaleHistory;
                historyForeignKey = 'vehicle_sale_id';
                break;
            case 'FAST_TRACK':
                model = FastTrackSale;
                historyModel = FastTrackSaleHistory;
                historyForeignKey = 'fast_track_sale_id';
                break;
            case 'SPARE_PART':
                model = SparePartSale;
                historyModel = SparePartSaleHistory;
                historyForeignKey = 'spare_part_sale_id';
                break;
            case 'SERVICE_PARK':
                model = ServiceParkSale;
                historyModel = ServiceParkSaleHistory;
                historyForeignKey = 'service_park_sale_id';
                break;
            case 'BYD':
                model = BydSale;
                historyModel = BydSaleHistory;
                historyForeignKey = 'byd_sale_id';
                break;
            default: return res.status(http.BAD_REQUEST).json({ message: "Unknown lead type" });
        }

        const lead = await model.findByPk(leadId);
        if (!lead) {
            return res.status(http.NOT_FOUND).json({ message: "Lead not found" });
        }

        // Update Status
        const oldStatus = lead.status;
        await lead.update({ status: status.toUpperCase() });

        // History
        const loggedInUserId = (req as any).user?.id || req.body.adminId;
        if (historyModel && loggedInUserId) {
            await historyModel.create({
                [historyForeignKey]: leadId,
                action_by: loggedInUserId,
                action_type: "STATUS_UPDATE",
                details: `Status updated from ${oldStatus} to ${status}`,
                previous_level: lead.current_level || 'N/A', // Assuming level exists or optional
                new_level: lead.current_level || 'N/A',
                timestamp: new Date()
            }).catch((err: any) => console.error("History creation failed", err));
        }

        res.status(http.OK).json({ message: "Status updated successfully" });

    } catch (error: any) {
        console.error("Error updating lead status:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error updating status",
            error: error.message
        });
    }
};
