import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";
import {Op} from "sequelize";

const {SparePartSale, SparePartSaleFollowup, SparePartSaleReminder, Customer, User, SparePartSaleHistory} = db;

const getLevelFromRole = (role: string): number => {
    if (role === "SALES01") return 1;
    if (role === "SALES02") return 2;
    if (role === "SALES03") return 3;
    return 0;
};


export const createSale = async (req: Request, res: Response) => {
    try {
        const {
            date,
            customer_id,
            call_agent_id,
            vehicle_make,
            vehicle_model,
            part_no,
            year_of_manufacture,
            additional_note,
        } = req.body;

        const sale = await SparePartSale.create({
            ticket_number: `IMS${Date.now()}`,
            date,
            customer_id,
            call_agent_id,
            vehicle_make,
            vehicle_model,
            part_no,
            year_of_manufacture,
            additional_note,
        });

        res.status(http.CREATED).json({message: "Sale created", sale});
    } catch (err) {
        console.error("createSale error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

// export const listSales = async (req: Request, res: Response) => {
//     try {
//         const {status, assigned_sales_id, call_agent_id} = req.query;
//         const where: any = {};
//         if (status) where.status = String(status).toUpperCase();
//         if (assigned_sales_id) where.assigned_sales_id = Number(assigned_sales_id);
//         if (call_agent_id) where.call_agent_id = Number(call_agent_id);
//
//         const sales = await SparePartSale.findAll({
//             where,
//             include: [
//                 {model: Customer, as: "customer"},
//                 {model: User, as: "callAgent", attributes: ["id", "full_name", "contact_no", "email"]},
//                 {model: User, as: "salesUser", attributes: ["id", "full_name", "contact_no", "email"]},
//             ],
//             order: [["createdAt", "DESC"]],
//         });
//         res.status(http.OK).json(sales);
//     } catch (err) {
//         console.error("listSales error:", err);
//         res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//     }
// };


// export const listSales = async (req: Request, res: Response) => {
//     try {
//         const userId = (req as any).user?.id || req.query.userId;
//
//         const {status, call_agent_id} = req.query;
//         const statusUpper = status ? String(status).toUpperCase() : undefined;
//
//         let whereClause: any = {};
//
//         if (call_agent_id) {
//             whereClause.call_agent_id = Number(call_agent_id);
//         }
//
//         if (statusUpper) {
//             if (statusUpper === "NEW") {
//                 whereClause.status = "NEW";
//             } else {
//                 if (!userId) {
//                     return res.status(http.UNAUTHORIZED).json({message: "User ID required to view assigned leads"});
//                 }
//                 whereClause.status = statusUpper;
//                 whereClause.assigned_sales_id = userId;
//             }
//         } else {
//             if (userId) {
//                 whereClause = {
//                     ...whereClause,
//                     [Op.or]: [
//                         {status: "NEW"},
//                         {assigned_sales_id: userId}
//                     ]
//                 };
//             } else {
//                 whereClause.status = "NEW";
//             }
//         }
//
//         const sales = await SparePartSale.findAll({
//             where: whereClause,
//             include: [
//                 {model: Customer, as: "customer"},
//                 {model: User, as: "callAgent", attributes: ["id", "full_name", "contact_no", "email"]},
//                 {model: User, as: "salesUser", attributes: ["id", "full_name", "contact_no", "email"]},
//             ],
//             order: [["createdAt", "DESC"]],
//         });
//         res.status(http.OK).json(sales);
//     } catch (err) {
//         console.error("listSales error:", err);
//         res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//     }
// };


export const listSales = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || Number(req.query.userId);
        const userRole = (req as any).user?.user_role || req.query.userRole;

        const userLevel = getLevelFromRole(userRole);

        // 2. Parse Status Query
        const statusParam = req.query.status;
        const status = typeof statusParam === "string" ? statusParam.toUpperCase() : undefined;

        let whereClause: any = {};

        // --- ADMIN VIEW (See All) ---
        if (userRole === "ADMIN") {
            if (status) whereClause.status = status;
        }

        // --- SALES AGENT VIEW (Strict Isolation) ---
        else if (userLevel > 0) {

            // RULE 1: Level Isolation
            // An agent can ONLY see leads sitting at their specific level.
            whereClause.current_level = userLevel;

            // RULE 2 & 3: Pool vs Assignment
            if (status) {
                // Case A: Filtering by specific status tab (e.g., clicking "Ongoing" tab)
                if (status === "NEW") {
                    // Shared Pool: See ALL 'NEW' leads at this level
                    whereClause.status = "NEW";
                } else {
                    // Private Assignment: See 'ONGOING/WON/LOST' ONLY if assigned to me
                    whereClause.status = status;
                    whereClause.assigned_sales_id = userId;
                }
            } else {
                // Case B: Dashboard / Kanban View (No status filter passed)
                // Show: (Any 'NEW' lead at this level) OR (Any lead at this level assigned to me)
                whereClause[Op.and] = [
                    { current_level: userLevel }, // Re-enforce level check
                    {
                        [Op.or]: [
                            { status: "NEW" },
                            {
                                [Op.and]: [
                                    { status: { [Op.ne]: "NEW" } }, // Status is NOT 'NEW'
                                    { assigned_sales_id: userId }    // AND assigned to user
                                ]
                            }
                        ]
                    }
                ];
            }
        }

        // --- CALL AGENT / FALLBACK ---
        else {
            // Only see what they created (optional, adjust as needed)
            // whereClause.call_agent_id = userId;
        }

        const sales = await SparePartSale.findAll({
            where: whereClause,
            include: [
                { model: Customer, as: "customer" },
                { model: User, as: "salesUser" }, // Assigned User
                { model: User, as: "callAgent" }, // Creator
            ],
            order: [["createdAt", "DESC"]],
        });

        res.status(http.OK).json(sales);
    } catch (err) {
        console.error("listSales error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const promoteToNextLevel = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const {id} = req.params;
        const userId = (req as any).user?.id || req.body.userId;

        const sale = await SparePartSale.findByPk(id);
        if (!sale) {
            await t.rollback();
            return res.status(http.NOT_FOUND).json({message: "Sale not found"});
        }

        const currentLevel = sale.current_level;
        const nextLevel = (currentLevel + 1) as 1 | 2 | 3;

        if (nextLevel > 3) {
            await t.rollback();
            return res.status(http.BAD_REQUEST).json({message: "Already at maximum sales level"});
        }

        sale.status = "NEW";
        sale.current_level = nextLevel;
        sale.assigned_sales_id = null;
        await sale.save({transaction: t});

        await SparePartSaleHistory.create({
            spare_part_sale_id: sale.id,
            action_by: userId,
            action_type: "PROMOTED_LEVEL",
            previous_level: currentLevel,
            new_level: nextLevel,
            details: `Lead escalated from Level ${currentLevel} to Level ${nextLevel}`,
            timestamp: new Date()
        } as any, {transaction: t});

        await t.commit();
        res.status(http.OK).json({message: `Lead promoted to Sales Level ${nextLevel}`, sale});

    } catch (error) {
        await t.rollback();
        console.error("Error promoting sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getSaleHistory = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const history = await SparePartSaleHistory.findAll({
            where: {spare_part_sale_id: id},
            order: [["timestamp", "DESC"]],
            include: [{model: User, as: "actor", attributes: ['full_name', 'user_role']}]
        });
        res.status(http.OK).json(history);
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Error fetching history"});
    }
};


export const getSaleByTicket = async (req: Request, res: Response) => {
    try {
        const {ticket} = req.params;
        const sale = await SparePartSale.findOne({
            where: {ticket_number: ticket},
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "callAgent", attributes: ["id", "full_name"]},
                {model: User, as: "salesUser", attributes: ["id", "full_name"]},
                {model: SparePartSaleFollowup, as: "followups", order: [["activity_date", "DESC"]]},
                {model: SparePartSaleReminder, as: "reminders", order: [["task_date", "ASC"]]}
            ],
        });
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});
        res.status(http.OK).json(sale);
    } catch (err) {
        console.error("getSaleByTicket error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const assignToSales = async (req: Request, res: Response) => {
    try {
        const {id} = req.params; // sale id
        const {salesUserId} = req.body;

        const sale = await SparePartSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.assigned_sales_id = salesUserId;
        sale.status = "NEW"; // remain new until salesman clicks "assign to me"
        await sale.save();
        res.status(http.OK).json({message: "Assigned", sale});
    } catch (err) {
        console.error("assignToSales error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const assignToMe = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {userId} = req.body;

        const sale = await SparePartSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.assigned_sales_id = userId;
        sale.status = "ONGOING";
        await sale.save();
        res.status(http.OK).json({message: "Sale claimed", sale});
    } catch (err) {
        console.error("assignToMe error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const updateSaleStatus = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {status} = req.body;

        if (!["WON", "LOST"].includes(status)) {
            return res.status(http.BAD_REQUEST).json({
                message: "Invalid status. Only 'WON' or 'LOST' are allowed.",
            });
        }

        const sale = await SparePartSale.findByPk(id);
        if (!sale) {
            return res.status(http.NOT_FOUND).json({message: "Sale not found"});
        }

        if (sale.status !== "ONGOING") {
            return res.status(http.BAD_REQUEST).json({
                message: `Cannot update status. Current status is '${sale.status}'. Only 'ONGOING' sales can be marked as 'WON' or 'LOST'.`,
            });
        }

        sale.status = status;
        await sale.save();

        return res.status(http.OK).json({
            message: `Sale status updated to ${status}`,
            sale,
        });
    } catch (err) {
        console.error("updateSaleStatus error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const createFollowup = async (req: Request, res: Response) => {
    try {
        const {activity, activity_date, spare_part_sale_id} = req.body;
        const sale = await SparePartSale.findByPk(spare_part_sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const f = await SparePartSaleFollowup.create({activity, activity_date, spare_part_sale_id});
        res.status(http.CREATED).json({message: "Followup created", followup: f});
    } catch (err) {
        console.error("createFollowup error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const createReminder = async (req: Request, res: Response) => {
    try {
        const {task_title, task_date, note, spare_part_sale_id} = req.body;
        const sale = await SparePartSale.findByPk(spare_part_sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const reminder = await SparePartSaleReminder.create({task_title, task_date, note, spare_part_sale_id});
        res.status(http.CREATED).json({message: "Reminder created", reminder: reminder});
    } catch (err) {
        console.error("createReminder error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const getFollowupsByTicket = async (req: Request, res: Response) => {
    try {
        const {ticket} = req.params;
        const sale = await SparePartSale.findOne({where: {ticket_number: ticket}});
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const followups = await SparePartSaleFollowup.findAll({
            where: {spare_part_sale_id: sale.id},
            order: [["activity_date", "DESC"]],
        });
        res.status(http.OK).json(followups);
    } catch (err) {
        console.error("getFollowupsByTicket error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getRemindersByTicket = async (req: Request, res: Response) => {
    try {
        const {ticket} = req.params;
        const sale = await SparePartSale.findOne({where: {ticket_number: ticket}});
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const reminders = await SparePartSaleReminder.findAll({
            where: {spare_part_sale_id: sale.id},
            order: [["task_date", "ASC"]],
        });
        res.status(http.OK).json(reminders);
    } catch (err) {
        console.error("getRemindersByTicket error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getNearestRemindersBySalesUser = async (req: Request, res: Response) => {
    try {
        const {userId} = req.params;

        if (!userId) {
            return res.status(400).json({message: "User ID is required"});
        }

        const salesWithReminders = await SparePartSale.findAll({
            where: {assigned_sales_id: userId},
            include: [
                {
                    model: SparePartSaleReminder,
                    as: "reminders",
                    where: {
                        task_date: {
                            [Op.gte]: new Date(),
                        },
                    },
                    required: true,
                    order: [["task_date", "ASC"]],
                },
                {
                    model: Customer,
                    as: "customer",
                    attributes: ["customer_name", "phone_number", "email"],
                },
            ],
            order: [[{model: SparePartSaleReminder, as: "reminders"}, "task_date", "ASC"]],
        });

        const nearestReminders = salesWithReminders.flatMap((sale: any) =>
            sale.reminders.map((reminder: any) => ({
                reminder_id: reminder.id,
                task_title: reminder.task_title,
                task_date: reminder.task_date,
                note: reminder.note,
                sale_id: sale.id,
                ticket_number: sale.ticket_number,
                customer_name: sale.customer?.customer_name,
                contact_number: sale.customer?.phone_number,
            }))
        );

        nearestReminders.sort(
            (a, b) => new Date(a.task_date).getTime() - new Date(b.task_date).getTime()
        );

        return res.status(200).json({data: nearestReminders});
    } catch (error: any) {
        console.error("getNearestRemindersBySalesUser error:", error);
        return res
            .status(500)
            .json({message: "Internal server error", error: error.message});
    }
};

export const updatePriority = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {priority} = req.body;

        if (priority === undefined || isNaN(priority)) {
            return res.status(400).json({message: "Valid priority is required"});
        }

        const sale = await SparePartSale.findByPk(id);

        if (!sale) {
            return res.status(404).json({message: "Sale not found"});
        }

        sale.priority = priority;
        await sale.save();

        return res.status(200).json({message: "Priority updated", sale});
    } catch (err) {
        console.error("updatePriority error:", err);
        res.status(500).json({message: "Server error"});
    }
};