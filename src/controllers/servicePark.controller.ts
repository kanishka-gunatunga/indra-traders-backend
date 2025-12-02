import {Request, Response} from "express";
import db from "../models";
import http from "http-status-codes";
import {Op} from "sequelize";

const {
    Customer,
    ServiceParkVehicleHistory,
    ServiceParkSale,
    User,
    ServiceParkSaleFollowUp,
    ServiceParkSaleReminder,
    ServiceParkSaleHistory
} = db;


export const handleCustomerAndVehicle = async (data: any) => {
    const {phone_number, customer_name, vehicle_no, ...rest} = data;

    let customer = await Customer.findOne({where: {phone_number}});
    if (!customer) {
        customer = await Customer.create({
            id: `CUS${Date.now()}`,
            customer_name,
            phone_number,
            ...rest,
        });
    }

    let vehicle = await ServiceParkVehicleHistory.findOne({where: {vehicle_no}});

    if (vehicle) {
        await vehicle.update({...rest, customer_id: customer.id});
    } else {
        vehicle = await ServiceParkVehicleHistory.create({
            // id: Date.now(),
            vehicle_no,
            customer_id: customer.id,
            ...rest,
        });
    }

    return {customer, vehicle};
};

export const handleServiceIntake = async (req: Request, res: Response) => {
    try {
        const result = await handleCustomerAndVehicle(req.body);
        return res.status(200).json({
            message: "Customer and vehicle history processed successfully",
            ...result,
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({error: "Failed to process intake", detail: err.message});
    }
};

export const createAssignToSale = async (req: Request, res: Response) => {
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
        } = req.body;

        const ticket_number = `ISP${Date.now()}`;

        const newSale = await ServiceParkSale.create({
            ticket_number,
            date: new Date(),
            customer_id,
            vehicle_id,
            vehicle_make,
            vehicle_model,
            service_category,
            year_of_manufacture,
            additional_note,
            lead_source,
            priority,
            status: "NEW",
        });

        res.status(201).json({message: "Sale assigned", sale: newSale});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Failed to create assign-to-sale"});
    }
};


export const assignToSalesAgent = async (req: Request, res: Response) => {
    try {
        const {saleId} = req.params;
        const {userId} = req.body;

        const sale = await ServiceParkSale.findByPk(saleId);
        if (!sale) return res.status(404).json({error: "Sale not found"});

        sale.sales_user_id = userId;
        sale.status = "ONGOING";
        await sale.save();

        res.json({message: "Sale assigned to agent", sale});
    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Failed to assign sale"});
    }
};


export const getSaleDetails = async (req: Request, res: Response) => {
    try {
        const {saleId} = req.params;

        const sale = await ServiceParkSale.findByPk(saleId, {
            include: [
                {model: Customer, as: "customer"},
                {model: ServiceParkVehicleHistory, as: "vehicle"},
                {model: ServiceParkSaleFollowUp, as: "followups"},
                {model: ServiceParkSaleReminder, as: "reminders"},
                {model: User, attributes: ["id", "full_name", "email"]},
            ],
        });

        if (!sale) return res.status(404).json({error: "Sale not found"});
        res.json(sale);
    } catch (err) {
        res.status(500).json({error: "Failed to fetch sale details"});
    }
};

export const getSaleDetailsByTicket = async (req: Request, res: Response) => {
    try {
        const {ticketNumber} = req.params;
        const saleDetails = await ServiceParkSale.findOne({
            where: {ticket_number: ticketNumber},
            include: [
                {model: Customer, as: "customer"},
                {model: ServiceParkVehicleHistory, as: "vehicle"},
                {model: ServiceParkSaleFollowUp, as: "followups"},
                {model: ServiceParkSaleReminder, as: "reminders"},
                {model: User, attributes: ["id", "full_name", "email"], as: "salesUser"},
            ]
        });

        if (!saleDetails) {
            return res.status(http.NOT_FOUND).json({error: "Sale not found"});
        }

        return res.status(http.OK).json(saleDetails);
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({message: "Internal server error", error: err.message});
    }
}


export const getVehicleHistoryByNumber = async (req: Request, res: Response) => {
    try {
        const {vehicleNo} = req.params;
        const history = await ServiceParkVehicleHistory.findOne({
            where: {vehicle_no: vehicleNo},
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "createdBy", attributes: ["full_name", "email", "user_role"]},
            ],
        });

        if (!history) {
            return res.status(404).json({message: "Vehicle history not found"});
        }

        return res.status(200).json({data: history});
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({message: "Internal server error", error: error.message});
    }
};


export const listVehicleHistories = async (req: Request, res: Response) => {
    try {
        const histories = await ServiceParkVehicleHistory.findAll({
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "createdBy", attributes: ["full_name", "email", "user_role"]},
            ],
        });

        return res.status(200).json({data: histories});
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({message: "Internal server error", error: error.message});
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


export const listServiceParkSales = async (req: Request, res: Response) => {
    try {

        const userId = (req as any).user?.id || req.query.userId;

        let whereClause: any = {};

        if (userId) {
            whereClause = {
                [Op.or]: [
                    { status: "NEW" },
                    { sales_user_id: userId }
                ]
            };
        } else {
            whereClause = { status: "NEW" };
        }

        const sales = await ServiceParkSale.findAll({
            where: whereClause,
            include: [
                { model: Customer, as: "customer" },
                { model: ServiceParkVehicleHistory, as: "vehicle" },
                { model: User, as: "salesUser", attributes: ["id", "full_name", "email"] },
            ],
            order: [["createdAt", "DESC"]]
        });

        return res.status(200).json({data: sales});
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({message: "Internal server error", error: error.message});
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
        const {id} = req.params;
        const {status} = req.body;

        if (!["WON", "LOST"].includes(status)) {
            return res.status(http.BAD_REQUEST).json({
                message: "Invalid status. Only 'WON' or 'LOST' are allowed.",
            });
        }

        const sale = await ServiceParkSale.findByPk(id);
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
        const {activity, activity_date, service_park_sale_id} = req.body;
        const sale = await ServiceParkSale.findByPk(service_park_sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const f = await ServiceParkSaleFollowUp.create({activity, activity_date, service_park_sale_id});
        res.status(http.CREATED).json({message: "Followup created", followup: f});
    } catch (err) {
        console.error("createFollowup error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const createReminder = async (req: Request, res: Response) => {
    try {
        const {task_title, task_date, note, service_park_sale_id} = req.body;
        const sale = await ServiceParkSale.findByPk(service_park_sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const reminder = await ServiceParkSaleReminder.create({task_title, task_date, note, service_park_sale_id});
        res.status(http.CREATED).json({message: "Reminder created", reminder: reminder});
    } catch (err) {
        console.error("createReminder error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getNearestRemindersBySalesUser = async (req: Request, res: Response) => {
    try {
        const {userId} = req.params;

        if (!userId) {
            return res.status(400).json({message: "User ID is required"});
        }

        const salesWithReminders = await ServiceParkSale.findAll({
            where: {sales_user_id: userId},
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
            order: [[{model: ServiceParkSaleReminder, as: "reminders"}, "task_date", "ASC"]],
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

        const sale = await ServiceParkSale.findByPk(id);

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