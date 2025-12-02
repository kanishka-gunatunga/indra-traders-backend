import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";
import {Op} from "sequelize";

const {User, VehicleSale, Customer, VehicleSaleReminder, VehicleSaleFollowup, VehicleSaleHistory} = db;

const getLevelFromRole = (role: string): number => {
    if (role === "SALES01") return 1;
    if (role === "SALES02") return 2;
    if (role === "SALES03") return 3;
    return 0;
};


export const createVehicleSale = async (req: Request, res: Response) => {
    try {
        const {
            date,
            customer_id,
            call_agent_id,
            vehicle_make,
            vehicle_model,
            manufacture_year,
            transmission,
            fuel_type,
            down_payment,
            price_from,
            price_to,
            additional_note,
        } = req.body;

        const newSale = await VehicleSale.create({
            ticket_number: `ITPL${Date.now()}`,
            date,
            customer_id,
            call_agent_id,
            vehicle_make,
            vehicle_model,
            manufacture_year,
            transmission,
            fuel_type,
            down_payment,
            price_from,
            price_to,
            additional_note,
        });

        res.status(http.CREATED).json({
            message: "Vehicle sale created successfully",
            sale: newSale,
        });
    } catch (error) {
        console.error("Error creating vehicle sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


// export const getVehicleSales = async (req: Request, res: Response) => {
//     try {
//         const statusParam = req.query.status;
//
//         const status =
//             typeof statusParam === "string" ? statusParam.toUpperCase() : undefined;
//
//         const whereClause = status
//             ? {status}
//             : undefined;
//
//         const sales = await VehicleSale.findAll({
//             where: whereClause,
//             include: [
//                 {model: Customer, as: "customer"},
//                 {model: User, as: "callAgent"},
//                 {model: User, as: "salesUser"},
//             ],
//         });
//
//         res.status(http.OK).json(sales);
//     } catch (error) {
//         console.error("Error fetching vehicle sales:", error);
//         res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//     }
// };

// export const getVehicleSales = async (req: Request, res: Response) => {
//     try {
//         const userId = (req as any).user?.id || req.query.userId;
//
//         const statusParam = req.query.status;
//
//         const status =
//             typeof statusParam === "string" ? statusParam.toUpperCase() : undefined;
//
//         let whereClause: any = {};
//
//         // const whereClause = status
//         //     ? {status}
//         //     : undefined;
//
//         if (status) {
//             if (status === "NEW") {
//                 whereClause = { status: "NEW" };
//             } else {
//                 if (!userId) {
//                     return res.status(http.UNAUTHORIZED).json({message:"User ID required for this status"});
//                 }
//
//                 whereClause = {
//                     status: status,
//                     assigned_sales_id: userId
//                 };
//             }
//         } else {
//             if (userId) {
//                 whereClause = {
//                     [Op.or]: [
//                         { status: "NEW" },
//                         { assigned_sales_id: userId }
//                     ]
//                 };
//             } else {
//                 whereClause = { status: "NEW" };
//             }
//         }
//
//         const sales = await VehicleSale.findAll({
//             where: whereClause,
//             include: [
//                 {model: Customer, as: "customer"},
//                 {model: User, as: "callAgent"},
//                 {model: User, as: "salesUser"},
//             ],
//             order: [["createdAt", "DESC"]],
//         });
//
//         res.status(http.OK).json(sales);
//     } catch (error) {
//         console.error("Error fetching vehicle sales:", error);
//         res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//     }
// };


export const getVehicleSales = async (req: Request, res: Response) => {
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

        const sales = await VehicleSale.findAll({
            where: whereClause,
            include: [
                { model: Customer, as: "customer" },
                { model: User, as: "salesUser" }, // Assigned User
                { model: User, as: "callAgent" }, // Creator
            ],
            order: [["createdAt", "DESC"]],
        });

        res.status(http.OK).json(sales);
    } catch (error) {
        console.error("Error fetching vehicle sales:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const promoteToNextLevel = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id || req.body.userId;

        const sale = await VehicleSale.findByPk(id);
        if (!sale) {
            await t.rollback();
            return res.status(http.NOT_FOUND).json({ message: "Sale not found" });
        }

        const currentLevel = sale.current_level;
        const nextLevel = (currentLevel + 1) as 1 | 2 | 3;

        if (nextLevel > 3) {
            await t.rollback();
            return res.status(http.BAD_REQUEST).json({ message: "Already at maximum sales level" });
        }

        sale.status = "NEW";
        sale.current_level = nextLevel;
        sale.assigned_sales_id = null;
        await sale.save({ transaction: t });

        await VehicleSaleHistory.create({
            vehicle_sale_id: sale.id,
            action_by: userId,
            action_type: "PROMOTED_LEVEL",
            previous_level: currentLevel,
            new_level: nextLevel,
            details: `Lead escalated from Level ${currentLevel} to Level ${nextLevel}`,
            timestamp: new Date()
        } as any, { transaction: t });

        await t.commit();
        res.status(http.OK).json({ message: `Lead promoted to Sales Level ${nextLevel}`, sale });

    } catch (error) {
        await t.rollback();
        console.error("Error promoting sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

export const getSaleHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const history = await VehicleSaleHistory.findAll({
            where: { vehicle_sale_id: id },
            order: [["timestamp", "DESC"]],
            include: [{ model: User, as: "actor", attributes: ['full_name', 'user_role'] }]
        });
        res.status(http.OK).json(history);
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error fetching history" });
    }
};



export const getSaleByTicketID = async (req: Request, res: Response) => {
    try {
        const {ticketNumber} = req.params;

        if (!ticketNumber)
            return res.status(http.BAD_REQUEST).json({message: "Ticket number is required"});

        const sale = await VehicleSale.findOne({
            where: {ticket_number: ticketNumber},
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "callAgent"},
                {model: User, as: "salesUser"},
                {model: VehicleSaleFollowup, as: "followups", order: [["activity_date", "DESC"]]},
                {model: VehicleSaleReminder, as: "reminders", order: [["task_date", "ASC"]]}
            ],
        });

        if (!sale)
            return res.status(http.NOT_FOUND).json({message: "Sale not found with this ticket number"});

        res.status(http.OK).json(sale);
    } catch (error) {
        console.error("Error fetching sale by ticket number:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const assignVehicleSale = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {salesUserId} = req.body;

        const sale = await VehicleSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.status = "ONGOING";
        sale.assigned_sales_id = salesUserId;
        await sale.save();

        res.status(http.OK).json({message: "Sale assigned successfully", sale});
    } catch (error) {
        console.error("Error assigning sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const updateSaleStatus = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {status} = req.body;

        const sale = await VehicleSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.status = status;
        await sale.save();

        res.status(http.OK).json({message: "Sale status updated", sale});
    } catch (error) {
        console.error("Error updating sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const deleteVehicleSale = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const sale = await VehicleSale.findByPk(id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});
        await sale.destroy();
        res.status(http.OK).json({message: "Vehicle sale deleted"});
    } catch (error) {
        console.error("Error deleting sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

// export const getVehicleSalesByStatus = async (req: Request, res: Response) => {
//     try {
//         const {status} = req.params;
//
//         const whereClause = {status: status.toUpperCase()};
//
//         const sales = await VehicleSale.findAll({
//             where: whereClause,
//             include: [
//                 {model: Customer, as: "customer"},
//                 {model: User, as: "callAgent"},
//                 {model: User, as: "salesUser"},
//             ],
//             order: [["createdAt", "DESC"]],
//         });
//
//         res.status(http.OK).json({
//             message: "Vehicle sales fetched successfully by status",
//             sales,
//         });
//     } catch (error) {
//         console.error("Error fetching vehicle sales by status:", error);
//         res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//     }
// };


export const getVehicleSalesByStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || req.query.userId;
        const { status } = req.params;
        const statusUpper = status.toUpperCase();

        let whereClause: any = {};

        if (statusUpper === "NEW") {
            whereClause = { status: "NEW" };
        } else {
            if (!userId) {
                return res.status(http.UNAUTHORIZED).json({ message: "User ID required" });
            }
            whereClause = {
                status: statusUpper,
                assigned_sales_id: userId
            };
        }


        const sales = await VehicleSale.findAll({
            where: whereClause,
            include: [
                { model: Customer, as: "customer" },
                { model: User, as: "callAgent" },
                { model: User, as: "salesUser" },
            ],
            order: [["createdAt", "DESC"]],
        });

        res.status(http.OK).json({
            message: "Vehicle sales fetched successfully by status",
            sales,
        });
    } catch (error) {
        console.error("Error fetching vehicle sales by status:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getNearestRemindersBySalesUser = async (req: Request, res: Response) => {
    try {
        const {userId} = req.params;

        if (!userId) {
            return res.status(400).json({message: "User ID is required"});
        }

        const salesWithReminders = await VehicleSale.findAll({
            where: {assigned_sales_id: userId},
            include: [
                {
                    model: VehicleSaleReminder,
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
            order: [[{model: VehicleSaleReminder, as: "reminders"}, "task_date", "ASC"]],
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

        const sale = await VehicleSale.findByPk(id);

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