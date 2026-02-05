import { Request, Response } from "express";
import db from "../models";
import http from "http-status-codes";
import { Op } from "sequelize";
import dayjs from "dayjs";
import { logActivity } from "../services/logActivity";
import { sendNotification } from "../services/notification";


const {
    Customer,
    ServiceParkVehicleHistory,
    ServiceParkSale,
    User,
    ServiceParkSaleFollowUp,
    ServiceParkSaleReminder,
    ServiceParkSaleHistory,
    Service,
    Branch,
    ServiceLine,
    BranchService,
    Package,
    PackageService,
    BranchUnavailableDate,
    ServiceParkBooking
} = db;


const getLevelFromRole = (role: string): number => {
    if (role === "SALES01") return 1;
    if (role === "SALES02") return 2;
    if (role === "SALES03") return 3;
    return 0;
};


export const handleCustomerAndVehicle = async (data: any) => {
    const { phone_number, customer_name, vehicle_no, ...rest } = data;

    let customer = await Customer.findOne({ where: { phone_number } });
    if (!customer) {
        customer = await Customer.create({
            id: `CUS${Date.now()}`,
            customer_name,
            phone_number,
            ...rest,
        });
    }

    let vehicle = await ServiceParkVehicleHistory.findOne({ where: { vehicle_no } });

    if (vehicle) {
        await vehicle.update({ ...rest, customer_id: customer.id });
    } else {
        vehicle = await ServiceParkVehicleHistory.create({
            // id: Date.now(),
            vehicle_no,
            customer_id: customer.id,
            ...rest,
        });
    }

    return { customer, vehicle };
};

export const handleServiceIntake = async (req: Request, res: Response) => {
    try {
        const result = await handleCustomerAndVehicle(req.body);

        const userId = req.body.userId || (req as any).user?.id;
        if (userId) {
            logActivity({
                userId,
                module: "SERVICE_PARK",
                actionType: "UPDATE",
                entityId: result.vehicle.id,
                description: `Vehicle Intake: ${result.vehicle.vehicle_no} for ${result.customer.customer_name}`,
                changes: req.body
            });
        }

        return res.status(200).json({
            message: "Customer and vehicle history processed successfully",
            ...result,
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: "Failed to process intake", detail: err.message });
    }
};

// export const createAssignToSale = async (req: Request, res: Response) => {
//     try {
//         const {
//             customer_id,
//             vehicle_id,
//             vehicle_make,
//             vehicle_model,
//             year_of_manufacture,
//             service_category,
//             additional_note,
//             lead_source,
//             priority,
//         } = req.body;
//
//         const ticket_number = `ISP${Date.now()}`;
//
//         const newSale = await ServiceParkSale.create({
//             ticket_number,
//             date: new Date(),
//             customer_id,
//             vehicle_id,
//             vehicle_make,
//             vehicle_model,
//             service_category,
//             year_of_manufacture,
//             additional_note,
//             lead_source,
//             priority,
//             status: "NEW",
//         });
//
//         res.status(201).json({message: "Sale assigned", sale: newSale});
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({error: "Failed to create assign-to-sale"});
//     }
// };


export const createAssignToSale = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const {
            customer_id,
            vehicle_id,
            vehicle_make,
            vehicle_model,
            year_of_manufacture,
            service_category,
            additional_note,
            lead_source,
            priority,

            call_agent_id,

            customer_name,
            contact_number,
            email,
            city,
            vehicle_type,
            is_self_assigned,
            sales_user_id,
            remark
        } = req.body;

        const creatorId = is_self_assigned ? sales_user_id : call_agent_id;

        const creatorUser = await User.findByPk(creatorId);

        if (!creatorUser) {
            return res.status(http.BAD_REQUEST).json({ message: "Creator user not found" });
        }

        const userBranch = creatorUser.branch;

        let finalCustomerId = customer_id;
        let finalVehicleId = vehicle_id;

        if (is_self_assigned && !customer_id) {
            let customer = await Customer.findOne({ where: { phone_number: contact_number }, transaction: t });
            if (!customer) {
                customer = await Customer.create({
                    id: `CUS${Date.now()}`,
                    customer_name,
                    phone_number: contact_number,
                    email,
                    city,
                    lead_source: lead_source || "Direct Walk-in"
                } as any, { transaction: t });
            }

            finalCustomerId = customer.id;

            const tempVehicleNo = `TEMP-${Date.now()}`;

            const vehicle = await ServiceParkVehicleHistory.create({
                vehicle_no: tempVehicleNo,
                customer_id: finalCustomerId,
                // Map simplified fields. Note: Your VehicleHistory model has owner_name, contact_no fields
                // that are separate from the Customer model.
                owner_name: customer_name,
                contact_no: contact_number,
                odometer: 0, // Mandatory field, default to 0
                created_by: sales_user_id,
                // You might want to add 'make' and 'model' to VehicleHistory attributes if not present,
                // or just store them in the Sale record as snapshots.
            }, { transaction: t });

            finalVehicleId = vehicle.id;
        }

        let status: "NEW" | "ONGOING" = "NEW";
        let assignedId: number | null = null;
        let currentLevel: 1 | 2 | 3 = 1;

        if (is_self_assigned && sales_user_id) {
            status = "ONGOING";
            assignedId = sales_user_id;
            const salesUser = await User.findByPk(sales_user_id);
            if (salesUser) {
                currentLevel = getLevelFromRole(salesUser.user_role) as 1 | 2 | 3;
            }
        }

        const newSale = await ServiceParkSale.create({
            ticket_number: `ISP${Date.now()}`,
            date: new Date(),
            customer_id: finalCustomerId,
            vehicle_id: finalVehicleId,

            branch: userBranch,

            // Snapshot details for the sale table
            vehicle_make: vehicle_make || "Unknown",
            vehicle_model: vehicle_model || "Unknown",
            year_of_manufacture: year_of_manufacture || new Date().getFullYear(),
            service_category: service_category || "General",

            additional_note: additional_note || remark, // Mapped from remark
            lead_source,
            priority: priority || 0,

            status,
            sales_user_id: assignedId,
            current_level: currentLevel
        }, { transaction: t });

        if (assignedId && db.ServiceParkSaleHistory) {
            await db.ServiceParkSaleHistory.create({
                service_park_sale_id: newSale.id,
                action_by: assignedId,
                action_type: "CREATED_AND_SELF_ASSIGNED",
                previous_level: 0,
                new_level: currentLevel,
                details: `Lead created and self-assigned by Sales Agent`,
                timestamp: new Date()
            } as any, { transaction: t });
        }

        // const ticket_number = `ISP${Date.now()}`;
        //
        // const newSale = await ServiceParkSale.create({
        //     ticket_number,
        //     date: new Date(),
        //     customer_id,
        //     vehicle_id,
        //     vehicle_make,
        //     vehicle_model,
        //     service_category,
        //     year_of_manufacture,
        //     additional_note,
        //     lead_source,
        //     priority,
        //     status: "NEW",
        // });

        await t.commit();

        const actingUserId = is_self_assigned ? sales_user_id : call_agent_id;

        logActivity({
            userId: actingUserId,
            module: "SERVICE_PARK",
            actionType: "CREATE",
            entityId: newSale.id,
            description: `Service Park Job created for ${customer_name} (${vehicle_make} ${vehicle_model})`,
            changes: req.body
        });

        if (assignedId) {
            sendNotification({
                userId: assignedId,
                title: "New Service Job",
                message: `Service Park Ticket ${newSale.ticket_number} is active.`,
                type: "ASSIGNMENT",
                referenceId: newSale.id,
                referenceModule: "SERVICE_PARK"
            });
        }


        res.status(201).json({ message: "Sale assigned", sale: newSale });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create assign-to-sale" });
    }
};


export const assignToSalesAgent = async (req: Request, res: Response) => {
    try {
        const { saleId } = req.params;
        const { userId } = req.body;

        const sale = await ServiceParkSale.findByPk(saleId);
        if (!sale) return res.status(404).json({ error: "Sale not found" });

        sale.sales_user_id = userId;
        sale.status = "ONGOING";
        await sale.save();

        // const adminId = (req as any).user?.id || 1;

        logActivity({
            userId: userId,
            module: "SERVICE_PARK",
            actionType: "ASSIGN",
            entityId: sale.id,
            description: `Service Sale reassigned to User ID ${userId}`,
            changes: { new_sales_user_id: userId }
        });


        res.json({ message: "Sale assigned to agent", sale });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to assign sale" });
    }
};


export const getSaleDetails = async (req: Request, res: Response) => {
    try {
        const { saleId } = req.params;

        const sale = await ServiceParkSale.findByPk(saleId, {
            include: [
                { model: Customer, as: "customer" },
                { model: ServiceParkVehicleHistory, as: "vehicle" },
                {
                    model: ServiceParkSaleFollowUp, as: "followups",
                    include: [
                        { model: User, as: "creator", attributes: ["full_name", "user_role"] }
                    ]
                },
                {
                    model: ServiceParkSaleReminder, as: "reminders",
                    include: [
                        { model: User, as: "creator", attributes: ["full_name", "user_role"] }
                    ]
                },
                { model: User, attributes: ["id", "full_name", "email"] },
            ],
        });

        if (!sale) return res.status(404).json({ error: "Sale not found" });
        res.json(sale);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch sale details" });
    }
};

export const getSaleDetailsByTicket = async (req: Request, res: Response) => {
    try {
        const { ticketNumber } = req.params;
        const saleDetails = await ServiceParkSale.findOne({
            where: { ticket_number: ticketNumber },
            include: [
                { model: Customer, as: "customer" },
                { model: ServiceParkVehicleHistory, as: "vehicle" },
                {
                    model: ServiceParkSaleFollowUp, as: "followups",
                    include: [
                        { model: User, as: "creator", attributes: ["full_name", "user_role"] }
                    ]
                },
                {
                    model: ServiceParkSaleReminder, as: "reminders",
                    include: [
                        { model: User, as: "creator", attributes: ["full_name", "user_role"] }
                    ]
                },
                { model: User, attributes: ["id", "full_name", "email"], as: "salesUser" },
            ]
        });

        if (!saleDetails) {
            return res.status(http.NOT_FOUND).json({ error: "Sale not found" });
        }

        return res.status(http.OK).json(saleDetails);
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error", error: err.message });
    }
}


export const getVehicleHistoryByNumber = async (req: Request, res: Response) => {
    try {
        const { vehicleNo } = req.params;
        const history = await ServiceParkVehicleHistory.findOne({
            where: { vehicle_no: vehicleNo },
            include: [
                { model: Customer, as: "customer" },
                { model: User, as: "createdBy", attributes: ["full_name", "email", "user_role"] },
            ],
        });

        if (!history) {
            return res.status(404).json({ message: "Vehicle history not found" });
        }

        return res.status(200).json({ data: history });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


export const listVehicleHistories = async (req: Request, res: Response) => {
    try {
        const histories = await ServiceParkVehicleHistory.findAll({
            include: [
                { model: Customer, as: "customer" },
                { model: User, as: "createdBy", attributes: ["full_name", "email", "user_role"] },
            ],
        });

        return res.status(200).json({ data: histories });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


// export const listServiceParkSales = async (req: Request, res: Response) => {
//     try {
//         const sales = await ServiceParkSale.findAll({
//             include: [
//                 {model: Customer, as: "customer"},
//                 {model: ServiceParkVehicleHistory, as: "vehicle"},
//                 {model: User, as: "salesUser", attributes: ["id", "full_name", "email"]},
//             ],
//         });
//
//         return res.status(200).json({data: sales});
//     } catch (error: any) {
//         console.error(error);
//         return res.status(500).json({message: "Internal server error", error: error.message});
//     }
// };


// export const listServiceParkSales = async (req: Request, res: Response) => {
//     try {
//
//         const userId = (req as any).user?.id || req.query.userId;
//
//         let whereClause: any = {};
//
//         if (userId) {
//             whereClause = {
//                 [Op.or]: [
//                     { status: "NEW" },
//                     { sales_user_id: userId }
//                 ]
//             };
//         } else {
//             whereClause = { status: "NEW" };
//         }
//
//         const sales = await ServiceParkSale.findAll({
//             where: whereClause,
//             include: [
//                 { model: Customer, as: "customer" },
//                 { model: ServiceParkVehicleHistory, as: "vehicle" },
//                 { model: User, as: "salesUser", attributes: ["id", "full_name", "email"] },
//             ],
//             order: [["createdAt", "DESC"]]
//         });
//
//         return res.status(200).json({data: sales});
//     } catch (error: any) {
//         console.error(error);
//         return res.status(500).json({message: "Internal server error", error: error.message});
//     }
// };


export const listServiceParkSales = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || Number(req.query.userId);

        const currentUser = await User.findByPk(userId);

        if (!currentUser) {
            return res.status(http.UNAUTHORIZED).json({ message: "User not authenticated" });
        }

        const userRole = (req as any).user?.user_role || req.query.userRole;
        const userBranch = currentUser.branch;

        const userLevel = getLevelFromRole(userRole);

        // --- FILTER PARAMS ---
        const statusParam = req.query.status as string;
        const search = req.query.search as string;
        const priority = req.query.priority as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        const status = typeof statusParam === "string" ? statusParam.toUpperCase() : undefined;

        let whereClause: any = {};

        // 1. Base Filters (Search, Priority, Date)
        if (search) {
            whereClause[Op.or] = [
                { ticket_number: { [Op.like]: `%${search}%` } },
                { '$customer.customer_name$': { [Op.like]: `%${search}%` } },
                { '$customer.phone_number$': { [Op.like]: `%${search}%` } },
                { '$customer.email$': { [Op.like]: `%${search}%` } }
            ];
        }

        if (priority) {
            const pVal = priority.toUpperCase().replace("P", "");
            if (!isNaN(Number(pVal))) {
                whereClause.priority = Number(pVal);
            }
        }

        if (startDate && endDate) {
            whereClause.date = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            whereClause.date = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            whereClause.date = {
                [Op.lte]: new Date(endDate)
            };
        }


        // 2. Role Based Access Control & Status Filtering
        if (userRole === "ADMIN") {
            if (status && status !== "ALL STATUS") whereClause.status = status;
        } else {
            whereClause.branch = userBranch;
            if (userLevel > 0) {

                whereClause.current_level = userLevel;

                if (status && status !== "ALL STATUS") {
                    if (status === "NEW") {
                        whereClause.status = "NEW";
                    } else {
                        whereClause.status = status;
                        whereClause.sales_user_id = userId;
                    }
                } else {
                    whereClause[Op.and] = [
                        { current_level: userLevel },
                        { branch: userBranch },
                        ...(whereClause[Op.and] || []),
                        {
                            [Op.or]: [
                                { status: "NEW" },
                                {
                                    [Op.and]: [
                                        { status: { [Op.ne]: "NEW" } },
                                        { sales_user_id: userId }
                                    ]
                                }
                            ]
                        }
                    ];
                }
            }
        }

        // if (userId) {
        //     whereClause = {
        //         [Op.or]: [
        //             { status: "NEW" },
        //             { sales_user_id: userId }
        //         ]
        //     };
        // } else {
        //     whereClause = { status: "NEW" };
        // }

        const sales = await ServiceParkSale.findAll({
            where: whereClause,
            include: [
                { model: Customer, as: "customer" },
                { model: ServiceParkVehicleHistory, as: "vehicle" },
                { model: User, as: "salesUser", attributes: ["id", "full_name", "email"] },
            ],
            order: [["createdAt", "DESC"]]
        });

        return res.status(200).json({ data: sales });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


export const promoteToNextLevel = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id || req.body.userId;

        const sale = await ServiceParkSale.findByPk(id);
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
        sale.sales_user_id = null;
        await sale.save({ transaction: t });

        await ServiceParkSaleHistory.create({
            service_park_sale_id: sale.id,
            action_by: userId,
            action_type: "PROMOTED_LEVEL",
            previous_level: currentLevel,
            new_level: nextLevel,
            details: `Lead escalated from Level ${currentLevel} to Level ${nextLevel}`,
            timestamp: new Date()
        } as any, { transaction: t });

        await t.commit();


        logActivity({
            userId,
            module: "SERVICE_PARK",
            actionType: "UPDATE",
            entityId: sale.id,
            description: `Job escalated to Level ${nextLevel}`,
            changes: { ticket: sale.ticket_number, previousLevel: currentLevel }
        });


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
        const history = await ServiceParkSaleHistory.findAll({
            where: { service_park_sale_id: id },
            order: [["timestamp", "DESC"]],
            include: [{ model: User, as: "actor", attributes: ['full_name', 'user_role'] }]
        });
        res.status(http.OK).json(history);
    } catch (error) {
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error fetching history" });
    }
};


export const updateSaleStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["WON", "LOST", "ONGOING"].includes(status)) {
            return res.status(http.BAD_REQUEST).json({
                message: "Invalid status. Only 'WON' or 'LOST' are allowed.",
            });
        }

        const sale = await ServiceParkSale.findByPk(id);
        if (!sale) {
            return res.status(http.NOT_FOUND).json({ message: "Sale not found" });
        }

        const oldStatus = sale.status;

        sale.status = status;
        await sale.save();


        logActivity({
            userId: sale.sales_user_id || 1,
            module: "SERVICE_PARK",
            actionType: "STATUS_CHANGE",
            entityId: sale.id,
            description: `Status updated from ${oldStatus} to ${status}`,
            changes: { ticket: sale.ticket_number, status }
        });

        return res.status(http.OK).json({
            message: `Sale status updated to ${status}`,
            sale,
        });
    } catch (err) {
        console.error("updateSaleStatus error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};


export const createFollowup = async (req: Request, res: Response) => {
    try {
        const { activity, activity_date, service_park_sale_id, userId } = req.body;

        const followup = await ServiceParkSaleFollowUp.create({
            activity,
            activity_date,
            service_park_sale_id,
            created_by: userId
        });

        const fullFollowup = await ServiceParkSaleFollowUp.findByPk(followup.id, {
            include: [{ model: User, as: "creator", attributes: ["full_name"] }]
        });

        res.status(201).json({ message: "Follow-up created", followup: fullFollowup });
    } catch (error) {
        console.error("Error creating follow-up:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const createReminder = async (req: Request, res: Response) => {
    try {
        const { task_title, task_date, note, service_park_sale_id, userId } = req.body;

        const followup = await ServiceParkSaleReminder.create({
            task_title,
            task_date,
            note,
            service_park_sale_id,
            created_by: userId
        });

        const fullFollowup = await ServiceParkSaleReminder.findByPk(followup.id, {
            include: [{ model: User, as: "creator", attributes: ["full_name"] }]
        });

        res.status(201).json({ message: "Follow-up created", followup: fullFollowup });
    } catch (error) {
        console.error("Error creating follow-up:", error);
        res.status(500).json({ message: "Server error" });
    }
};


export const getNearestRemindersBySalesUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const salesWithReminders = await ServiceParkSale.findAll({
            where: { sales_user_id: userId },
            include: [
                {
                    model: ServiceParkSaleReminder,
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
            order: [[{ model: ServiceParkSaleReminder, as: "reminders" }, "task_date", "ASC"]],
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

        return res.status(200).json({ data: nearestReminders });
    } catch (error: any) {
        console.error("getNearestRemindersBySalesUser error:", error);
        return res
            .status(500)
            .json({ message: "Internal server error", error: error.message });
    }
};

export const updatePriority = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;

        if (priority === undefined || isNaN(priority)) {
            return res.status(400).json({ message: "Valid priority is required" });
        }

        const sale = await ServiceParkSale.findByPk(id);

        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        sale.priority = priority;
        await sale.save();

        logActivity({
            userId: sale.sales_user_id || 1,
            module: "SERVICE_PARK",
            actionType: "UPDATE",
            entityId: sale.id,
            description: `Priority updated to P${priority}`,
            changes: { ticket: sale.ticket_number, priority }
        });

        return res.status(200).json({ message: "Priority updated", sale });
    } catch (err) {
        console.error("updatePriority error:", err);
        res.status(500).json({ message: "Server error" });
    }
};


export const createService = async (req: Request, res: Response) => {
    try {
        const { name, type, description, base_price } = req.body;
        const service = await Service.create({ name, type, description, base_price });
        return res.status(http.CREATED).json({ message: "Service created", service });
    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error creating service", error: error.message });
    }
};

export const getAllServices = async (req: Request, res: Response) => {
    try {
        const services = await Service.findAll();
        return res.status(http.OK).json(services);
    } catch (error) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error fetching services" });
    }
};

export const createPackage = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const { name, short_description, description, serviceIds } = req.body; // serviceIds = [1, 2, 5]

        const services = await Service.findAll({
            where: { id: serviceIds }
        });

        if (!services || services.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: "No valid services selected" });
        }

        const totalPrice = services.reduce((sum: number, svc: any) => sum + Number(svc.base_price), 0);

        const newPackage = await Package.create({
            name,
            short_description,
            description,
            total_price: totalPrice
        }, { transaction: t });

        await (newPackage as any).addServices(serviceIds, { transaction: t });

        await t.commit();
        return res.status(201).json({ message: "Package created successfully", package: newPackage });
    } catch (error: any) {
        await t.rollback();
        console.error("Create Package Error:", error.parent?.sqlMessage || error.message);

        return res.status(500).json({
            message: "Error creating package",
            error: error.message,
            detail: error.parent?.sqlMessage
        });
    }
};


export const createBranch = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const {
            name, location_code, contact_number, address, email,
            unavailable_dates, lines, custom_pricing
        } = req.body;

        const branch = await Branch.create({
            name, contact_number, email, address, is_active: true
        }, { transaction: t });


        if (unavailable_dates && unavailable_dates.length > 0) {
            const dateRecords = unavailable_dates.map((item: { date: string, reason: string }) => ({
                branch_id: branch.id,
                date: item.date,
                reason: item.reason || "Unavailable"
            }));
            await BranchUnavailableDate.bulkCreate(dateRecords, { transaction: t });
        }

        if (lines && lines.length > 0) {
            const lineRecords = lines.map((line: any) => ({
                branch_id: branch.id,
                name: line.name,
                type: line.type,
                advisor: line.advisor,
                status: "ACTIVE"
            }));
            await ServiceLine.bulkCreate(lineRecords, { transaction: t });
        }

        if (custom_pricing && custom_pricing.length > 0) {
            const serviceRecords = custom_pricing.map((item: any) => ({
                branch_id: branch.id,
                service_id: item.service_id,
                price: item.price,
                is_available: true
            }));
            await BranchService.bulkCreate(serviceRecords, { transaction: t });
        }

        await t.commit();
        return res.status(201).json({ message: "Branch fully configured successfully", branch });
    } catch (error: any) {
        await t.rollback();
        console.error("Create Branch Error:", error);
        return res.status(500).json({
            message: "Error creating branch configuration",
            error: error.message,
            detail: error.original?.sqlMessage || "Check server logs"
        });
    }
};

export const listBranches = async (req: Request, res: Response) => {
    try {
        const branches = await Branch.findAll();
        return res.status(http.OK).json(branches);
    } catch (error) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error fetching branches" });
    }
};

export const getBranchDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const branch = await Branch.findByPk(id, {
            include: [
                {
                    model: Service,
                    as: "services",
                    through: { attributes: ["price", "is_available"] }
                },
                {
                    model: ServiceLine,
                    as: "serviceLines",
                },
                {
                    model: BranchUnavailableDate,
                    as: "unavailableDates",
                }
            ]
        });

        if (!branch) return res.status(http.NOT_FOUND).json({ message: "Branch not found" });
        return res.status(http.OK).json(branch);
    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error fetching details", error: error.message });
    }
};

export const addServiceToBranch = async (req: Request, res: Response) => {
    try {
        const { branchId } = req.params;
        const { service_id, custom_price } = req.body;

        const branch = await Branch.findByPk(branchId);
        if (!branch) return res.status(http.NOT_FOUND).json({ message: "Branch not found" });


        await BranchService.upsert({
            branch_id: Number(branchId),
            service_id: service_id,
            price: custom_price,
            is_available: true
        });

        return res.status(http.OK).json({ message: "Service added/updated for branch successfully" });
    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error adding service", error: error.message });
    }
};


export const createServiceLine = async (req: Request, res: Response) => {
    try {
        const { branchId } = req.params;
        const { name, type, advisor } = req.body;

        const line = await ServiceLine.create({
            branch_id: Number(branchId),
            name,
            type,
            advisor,
            status: "ACTIVE"
        });

        return res.status(http.CREATED).json({ message: "Service Line created", line });
    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({
            message: "Error creating service line",
            error: error.message
        });
    }
};

export const getBranchServiceLines = async (req: Request, res: Response) => {
    try {
        const { branchId } = req.params;

        // Validate branchId
        const numericBranchId = Number(branchId);
        if (!branchId || isNaN(numericBranchId)) {
            return res.status(http.BAD_REQUEST).json({
                error: "Invalid branchId"
            });
        }

        // Verify branch exists
        const branch = await Branch.findByPk(numericBranchId);
        if (!branch) {
            return res.status(http.NOT_FOUND).json({
                error: "Branch not found"
            });
        }

        // Query service lines for the branch
        const serviceLines = await ServiceLine.findAll({
            where: {
                branch_id: numericBranchId
            },
            attributes: ['id', 'name', 'type', 'advisor'],
            order: [['name', 'ASC']]
        });

        // Return array (empty array if no service lines exist)
        return res.status(http.OK).json(serviceLines);

    } catch (error: any) {
        console.error("Get Branch Service Lines Error: ", error);
        return res.status(http.INTERNAL_SERVER_ERROR).json({
            error: error.message || "Internal server error"
        });
    }
};

export const updateService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, base_price } = req.body;

        const service = await Service.findByPk(id);
        if (!service) return res.status(404).json({ message: "Service not found" });

        await service.update({ name, type, base_price });
        return res.status(200).json({ message: "Service updated", service });
    } catch (error: any) {
        return res.status(500).json({ message: "Error updating service", error: error.message });
    }
};

export const deleteService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await Service.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ message: "Service not found" });
        return res.status(200).json({ message: "Service deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({ message: "Error deleting service", error: error.message });
    }
};

export const getAllPackages = async (req: Request, res: Response) => {
    try {
        const packages = await Package.findAll({
            include: [{
                model: Service,
                as: 'services',
                through: { attributes: [] }
            }]
        });
        return res.status(200).json(packages);
    } catch (error: any) {
        return res.status(500).json({ message: "Error fetching packages", error: error.message });
    }
};

export const updatePackage = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { name, short_description, description, serviceIds } = req.body;

        const pkg = await Package.findByPk(id);
        if (!pkg) {
            await t.rollback();
            return res.status(404).json({ message: "Package not found" });
        }

        let totalPrice = pkg.total_price;
        if (serviceIds) {
            const services = await Service.findAll({ where: { id: serviceIds } });
            if (!services.length) {
                await t.rollback();
                return res.status(400).json({ message: "No valid services provided" });
            }
            totalPrice = services.reduce((sum: number, s: any) => sum + Number(s.base_price), 0);
        }

        await pkg.update({
            name,
            short_description,
            description,
            total_price: totalPrice
        }, { transaction: t });

        if (serviceIds) {
            await (pkg as any).setServices(serviceIds, { transaction: t });
        }

        await t.commit();

        const updatedPkg = await Package.findByPk(id, { include: ['services'] });
        return res.status(200).json({ message: "Package updated", package: updatedPkg });

    } catch (error: any) {
        await t.rollback();
        console.error("Update Package Error:", error);
        return res.status(500).json({ message: "Error updating package", error: error.message });
    }
};

export const deletePackage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await Package.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ message: "Package not found" });
        return res.status(200).json({ message: "Package deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({ message: "Error deleting package", error: error.message });
    }
};


export const updateBranch = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            name, contact_number, address, email,
            unavailable_dates, lines, custom_pricing
        } = req.body;

        const branch = await Branch.findByPk(id);
        if (!branch) {
            await t.rollback();
            return res.status(404).json({ message: "Branch not found" });
        }

        await branch.update({
            name, contact_number, address, email
        }, { transaction: t });


        if (unavailable_dates) {
            await BranchUnavailableDate.destroy({ where: { branch_id: id }, transaction: t });

            if (unavailable_dates.length > 0) {
                const dateRecords = unavailable_dates.map((item: { date: string, reason: string }) => ({
                    branch_id: id,
                    date: item.date,
                    reason: item.reason || "Unavailable"
                }));
                await BranchUnavailableDate.bulkCreate(dateRecords, { transaction: t });
            }
        }

        if (lines) {
            await ServiceLine.destroy({ where: { branch_id: id }, transaction: t });

            if (lines.length > 0) {
                const lineRecords = lines.map((line: any) => ({
                    branch_id: id,
                    name: line.name,
                    type: line.type,
                    advisor: line.advisor,
                    status: "ACTIVE"
                }));
                await ServiceLine.bulkCreate(lineRecords, { transaction: t });
            }
        }

        if (custom_pricing) {
            await BranchService.destroy({ where: { branch_id: id }, transaction: t });

            if (custom_pricing.length > 0) {
                const serviceRecords = custom_pricing.map((item: any) => ({
                    branch_id: id,
                    service_id: item.service_id,
                    price: item.price,
                    is_available: true
                }));
                await BranchService.bulkCreate(serviceRecords, { transaction: t });
            }
        }

        await t.commit();
        return res.status(200).json({ message: "Branch updated successfully", branch });
    } catch (error: any) {
        await t.rollback();
        console.error("Update Branch Error:", error);
        return res.status(500).json({ message: "Error updating branch", error: error.message });
    }
};

export const deleteBranch = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const branch = await Branch.findByPk(id);

        if (!branch) {
            await t.rollback();
            return res.status(404).json({ message: "Branch not found" });
        }

        await BranchUnavailableDate.destroy({ where: { branch_id: id }, transaction: t });
        await BranchService.destroy({ where: { branch_id: id }, transaction: t });
        await ServiceLine.destroy({ where: { branch_id: id }, transaction: t });

        await branch.destroy({ transaction: t });

        await t.commit();
        return res.status(200).json({ message: "Branch deleted successfully" });
    } catch (error: any) {
        await t.rollback();
        return res.status(500).json({ message: "Error deleting branch", error: error.message });
    }
};


export const getBranchCatalog = async (req: Request, res: Response) => {
    try {
        const { branchId } = req.params;

        const branchServices = await Branch.findByPk(branchId, {
            include: [
                {
                    model: Service,
                    as: "services",
                    attributes: ["id", "name", "type", "description", "base_price"],
                    through: { attributes: ["price", "is_available"] }
                }
            ]
        });

        if (!branchServices) {
            return res.status(404).json({ message: "Branch not found" });
        }

        const packages = await Package.findAll({
            include: [{
                model: Service,
                as: 'services',
                attributes: ["id", "name", "type", "base_price"]
            }]
        });

        const formattedServices = branchServices.services?.map((svc: any) => ({
            id: svc.id,
            name: svc.name,
            type: svc.type,
            description: svc.description,
            price: svc.BranchService?.price ? parseFloat(svc.BranchService.price) : parseFloat(svc.base_price),
            is_package: false
        })) || [];

        const formattedPackages = packages.map((pkg: any) => ({
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            short_description: pkg.short_description,
            total_price: parseFloat(pkg.total_price),
            is_package: true,
            contents: pkg.services.map((s: any) => ({
                id: s.id,
                name: s.name,
                type: s.type,
                price: parseFloat(s.base_price)
            }))
        }));

        return res.status(200).json({
            services: formattedServices,
            packages: formattedPackages
        });

    } catch (error: any) {
        console.error("Get Branch Catalog Error:", error);
        return res.status(500).json({ message: "Error fetching catalog", error: error.message });
    }
};


const MOCK_PROMOS = [
    {
        code: "NEWSERVICE500",
        discountType: "FIXED",
        amount: 500,
        applicableTypes: ["ALL"],
        description: "Loyalty Discount: 500 LKR off total bill",
        category: "Indra Traders (ITPL)",
        points: "500"
    },
    {
        code: "REPAIR10",
        discountType: "PERCENTAGE",
        amount: 10,
        applicableTypes: ["Repair"],
        description: "10% off on all Repair Services",
        category: "Seasonal Offer",
        points: "0"
    },
    {
        code: "PAINT20",
        discountType: "PERCENTAGE",
        amount: 20,
        applicableTypes: ["Paint"],
        description: "20% off on Painting Jobs",
        category: "Body Shop Special",
        points: "200"
    },
    {
        code: "SUMMERPACKAGE",
        discountType: "FIXED",
        amount: 1000,
        applicableTypes: ["Package"],
        description: "1000 LKR off on any Service Package",
        category: "Summer Sale",
        points: "100"
    }
];

export const validatePromoCode = async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(http.BAD_REQUEST).json({ isValid: false, message: "Required" });

        const normalizedCode = code.toUpperCase().trim();

        const promo = MOCK_PROMOS.find(p => p.code === normalizedCode);

        if (!promo) {
            return res.status(http.BAD_REQUEST).json({
                isValid: false,
                message: "Invalid or expired promo code"
            });
        }

        return res.status(http.OK).json({
            isValid: true,
            code: promo.code,
            discountType: promo.discountType,
            amount: promo.amount,
            applicableTypes: promo.applicableTypes,
            description: promo.description
        });

    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error", error: error.message });
    }
};


export const getAvailablePromos = async (req: Request, res: Response) => {
    try {
        return res.status(http.OK).json(MOCK_PROMOS);
    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error fetching promos" });
    }
};


const TOTAL_SLOTS = 18;

export const getMonthlyAvailability = async (req: Request, res: Response) => {
    try {
        const branchId = Number(req.query.branchId);
        const serviceLineId = Number(req.query.serviceLineId);
        const month = req.query.month as string;

        if (!branchId || !serviceLineId || !month) {
            return res.status(http.BAD_REQUEST).json({ message: "Missing params" });
        }

        const startOfMonth = dayjs(month as string).startOf('month').format('YYYY-MM-DD');
        const endOfMonth = dayjs(month as string).endOf('month').format('YYYY-MM-DD');

        const unavailable = await BranchUnavailableDate.findAll({
            where: {
                branch_id: Number(branchId),
                date: { [Op.between]: [startOfMonth, endOfMonth] }
            },
            attributes: ['date', 'reason']
        });

        const bookings = await ServiceParkBooking.findAll({
            where: {
                branch_id: branchId,
                service_line_id: serviceLineId,
                booking_date: { [Op.between]: [startOfMonth, endOfMonth] },
                status: { [Op.ne]: 'CANCELLED' }
            },
            attributes: ['booking_date', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
            group: ['booking_date']
        });

        const dots: Record<string, string[]> = {};

        bookings.forEach((b: any) => {
            const date = b.getDataValue('booking_date');
            const count = parseInt(b.getDataValue('count'), 10);

            if (count >= TOTAL_SLOTS) {
                dots[date] = ['red'];
            } else if (count > 0) {
                dots[date] = ['orange', 'green'];
            } else {
                dots[date] = ['green'];
            }
        });

        return res.status(http.OK).json({
            unavailableDates: unavailable,
            dots
        });

    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

export const getDailySlots = async (req: Request, res: Response) => {
    try {
        const branchId = Number(req.query.branchId);
        const serviceLineId = Number(req.query.serviceLineId);
        const date = req.query.date as string;

        if (!branchId || !serviceLineId || !date) {
            return res.status(http.BAD_REQUEST).json({ message: "Missing params" });
        }

        const bookings = await ServiceParkBooking.findAll({
            where: {
                branch_id: branchId,
                service_line_id: serviceLineId,
                booking_date: date,
                status: { [Op.ne]: 'CANCELLED' }
            }
        });

        return res.status(http.OK).json(bookings);
    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

export const createBooking = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const {
            branch_id, service_line_id, booking_date, slots, customer_id, vehicle_no, owner_name,
            contact_no,
            email,
            address
        } = req.body;


        const branchIdNum = Number(branch_id);
        const lineIdNum = Number(service_line_id);

        let finalCustomerId = customer_id;

        if (!finalCustomerId && contact_no) {
            let customer = await Customer.findOne({
                where: { phone_number: contact_no },
                transaction: t
            });

            if (!customer) {
                console.log("Customer not found, creating new...");
                customer = await Customer.create({
                    id: `CUS${Date.now()}`,
                    customer_name: owner_name,
                    phone_number: contact_no,
                    email: email || null,
                    // address: address || null,
                    city: address,
                    lead_source: "Service Park Booking"
                }, { transaction: t });


                // if (vehicle_no) {
                //     await ServiceParkVehicleHistory.create({
                //         vehicle_no: vehicle_no,
                //         customer_id: customer.id,
                //         owner_name: owner_name,
                //         contact_no: contact_no,
                //         odometer: 0,
                //         created_by: 1, // System or User ID
                //     }, { transaction: t });
                // }
            }

            finalCustomerId = customer.id;
        }

        if (!finalCustomerId) {
            await t.rollback();
            return res.status(400).json({ message: "Customer details (ID or Phone/Name) are required." });
        }

        if (vehicle_no) {
            const existingVehicle = await ServiceParkVehicleHistory.findOne({
                where: { vehicle_no },
                transaction: t
            });

            if (!existingVehicle) {
                await ServiceParkVehicleHistory.create({
                    vehicle_no,
                    customer_id: finalCustomerId,
                    owner_name: owner_name || "Unknown",
                    contact_no: contact_no || "Unknown",
                    odometer: 0,
                    created_by: (req as any).user?.id || 1,
                }, { transaction: t });
            }
        }


        const times = slots.map((s: any) => s.start);
        const existing = await ServiceParkBooking.findAll({
            where: {
                branch_id: branchIdNum,
                service_line_id: lineIdNum,
                booking_date,
                start_time: { [Op.in]: times },
                status: { [Op.ne]: 'CANCELLED' }
            },
            transaction: t
        });

        if (existing.length > 0) {
            await t.rollback();
            return res.status(http.CONFLICT).json({ message: "Some slots were just booked by another user." });
        }

        const bookingRecords = slots.map((slot: any) => ({
            branch_id: branchIdNum,
            service_line_id: lineIdNum,
            booking_date,
            start_time: slot.start,
            end_time: slot.end,
            status: "BOOKED",
            customer_id: finalCustomerId,
            vehicle_no: vehicle_no
        }));

        console.log("Final Customer Id used for booking:", finalCustomerId);

        await ServiceParkBooking.bulkCreate(bookingRecords, { transaction: t });

        await t.commit();

        const userId = (req as any).user?.id || 1;
        logActivity({
            userId: userId,
            module: "SERVICE_PARK",
            actionType: "CREATE",
            entityId: 0,
            description: `New Booking created for ${booking_date} (${slots.length} slots)`,
            changes: { branch_id, date: booking_date, slots }
        });

        return res.status(http.CREATED).json({ message: "Booking confirmed" });

    } catch (error: any) {
        await t.rollback();
        return res.status(http.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

export const getBookingById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const booking = await ServiceParkBooking.findByPk(id, {
            include: [
                { model: Customer, attributes: ["customer_name", "phone_number", "email", "city"] },
                { model: ServiceLine, attributes: ["name", "advisor", "type"] },
                { model: Branch, attributes: ["name"] }
            ]
        });

        if (!booking) {
            return res.status(http.NOT_FOUND).json({ message: "Booking not found" });
        }

        // Find all related slots for this appointment (same customer, vehicle, date, line)
        const relatedBookings = await ServiceParkBooking.findAll({
            where: {
                branch_id: booking.branch_id,
                service_line_id: booking.service_line_id,
                booking_date: booking.booking_date,
                customer_id: booking.customer_id,
                vehicle_no: booking.vehicle_no,
                status: { [Op.ne]: 'CANCELLED' }
            },
            attributes: ['id', 'start_time']
        });

        const responseData: any = booking.toJSON();
        responseData.related_slots = relatedBookings.map((b: any) => b.start_time);
        responseData.related_ids = relatedBookings.map((b: any) => b.id);

        return res.status(http.OK).json(responseData);
    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

export const cancelBooking = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const booking = await ServiceParkBooking.findByPk(id);

        if (!booking) {
            return res.status(http.NOT_FOUND).json({ message: "Booking not found" });
        }

        booking.status = "CANCELLED";
        await booking.save();

        const userId = (req as any).user?.id || 1;

        logActivity({
            userId: userId,
            module: "SERVICE_PARK",
            actionType: "UPDATE",
            entityId: booking.id,
            description: `Booking ${booking.id} cancelled`,
            changes: { status: "CANCELLED" }
        });

        return res.status(http.OK).json({ message: "Booking cancelled successfully" });
    } catch (error: any) {
        return res.status(http.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

export const rescheduleBooking = async (req: Request, res: Response) => {
    const t = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            branch_id, service_line_id, booking_date, slots, // New details
            customer_id, vehicle_no // Keep existing if not provided? Usually provided in new form
        } = req.body;

        // 1. Find and Cancel Old Booking
        const oldBooking = await ServiceParkBooking.findByPk(id);
        if (!oldBooking) {
            await t.rollback();
            return res.status(http.NOT_FOUND).json({ message: "Original booking not found" });
        }

        oldBooking.status = "CANCELLED";
        await oldBooking.save({ transaction: t });


        // 2. Validate New Slots Availability
        const times = slots.map((s: any) => s.start);
        const existing = await ServiceParkBooking.findAll({
            where: {
                branch_id,
                service_line_id,
                booking_date,
                start_time: { [Op.in]: times },
                status: { [Op.ne]: 'CANCELLED' }
            },
            transaction: t
        });

        if (existing.length > 0) {
            await t.rollback();
            return res.status(http.CONFLICT).json({ message: "Some new slots are already booked." });
        }

        // 3. Create New Bookings
        const bookingRecords = slots.map((slot: any) => ({
            branch_id,
            service_line_id,
            booking_date,
            start_time: slot.start,
            end_time: slot.end,
            status: "BOOKED",
            customer_id: customer_id || oldBooking.customer_id,
            vehicle_no: vehicle_no || oldBooking.vehicle_no
        }));

        await ServiceParkBooking.bulkCreate(bookingRecords, { transaction: t });

        await t.commit();

        const userId = (req as any).user?.id || 1;

        logActivity({
            userId: userId,
            module: "SERVICE_PARK",
            actionType: "UPDATE",
            entityId: oldBooking.id, // Log against old or use 0?
            description: `Booking rescheduled from ${oldBooking.booking_date} to ${booking_date}`,
            changes: { old_id: id, new_date: booking_date, new_slots: slots }
        });

        return res.status(http.OK).json({ message: "Booking rescheduled successfully" });

    } catch (error: any) {
        await t.rollback();
        return res.status(http.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};