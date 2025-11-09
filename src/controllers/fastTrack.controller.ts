// import {Request, Response, NextFunction} from "express";
// import {body, param, query, validationResult} from "express-validator";
// import httpStatus from "http-status-codes";
// import {Op, Sequelize} from "sequelize";
// import db from "../models";
//
// const {
//     FastTrackSale,
//     FastTrackRequest,
//     FastTrackBestMatch,
//     FastTrackFollowup,
//     FastTrackReminder,
//     VehicleListing,
//     Customer,
//     User
// } = db;
//
// interface CustomRequest extends Request {
//     user?: { id: number; user_role: string };
// }
//
// const validate = (validations: any[]) => {
//     return async (req: Request, res: Response, next: NextFunction) => {
//         await Promise.all(validations.map((validation: any) => validation.run(req)));
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(httpStatus.BAD_REQUEST).json({errors: errors.array()});
//         }
//         next();
//     };
// };
//
// export const createDirectRequest = async (req: CustomRequest, res: Response) => {
//     // if (req.user?.user_role !== "CALLAGENT") {
//     //     return res.status(httpStatus.FORBIDDEN).json({message: "Only call agents can create direct requests"});
//     // }
//     try {
//         const {
//             customer_id,
//             vehicle_type,
//             vehicle_make,
//             vehicle_model,
//             grade,
//             manufacture_year,
//             mileage_min,
//             mileage_max,
//             no_of_owners,
//             price_from,
//             price_to,
//         } = req.body;
//
//         const customer = await db.Customer.findByPk(customer_id);
//         if (!customer) {
//             return res.status(httpStatus.NOT_FOUND).json({message: "Customer not found"});
//         }
//
//         const directRequest = await FastTrackRequest.create({
//             customer_id,
//             vehicle_type,
//             vehicle_make,
//             vehicle_model,
//             grade,
//             manufacture_year,
//             mileage_min,
//             mileage_max,
//             no_of_owners,
//             price_from,
//             price_to,
//             call_agent_id: 1,
//             status: "PENDING",
//         });
//
//         res.status(httpStatus.CREATED).json({message: "Direct request created", directRequest});
//     } catch (err) {
//         console.error("createDirectRequest error:", err);
//         res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//     }
// }
//
// export const listDirectRequests = [
//     validate([
//         query("status").optional().isIn(["PENDING", "ASSIGNED", "COMPLETED"]),
//         query("vehicle_type").optional().isString(),
//         query("vehicle_make").optional().isString(),
//         query("vehicle_model").optional().isString(),
//     ]),
//     async (req: CustomRequest, res: Response) => {
//         // if (req.user?.user_role !== "TELEMARKETER") {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Only telemarketers can view direct requests"});
//         // }
//         try {
//             const {status, vehicle_type, vehicle_make, vehicle_model} = req.query;
//             const where: any = {};
//             if (status) where.status = status;
//             if (vehicle_type) where.vehicle_type = vehicle_type;
//             if (vehicle_make) where.vehicle_make = vehicle_make;
//             if (vehicle_model) where.vehicle_model = vehicle_model;
//
//             const directRequests = await FastTrackRequest.findAll({
//                 where,
//                 include: [
//                     {model: db.Customer, as: "customer"},
//                     {model: db.User, as: "callAgent", attributes: ["id", "full_name"]},
//                 ],
//                 order: [["createdAt", "DESC"]],
//             });
//
//             res.status(httpStatus.OK).json(directRequests);
//         } catch (err) {
//             console.error("listDirectRequests error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const createReminder = [
//     validate([
//         body("task_title").isString().notEmpty(),
//         body("task_date").isISO8601().toDate(),
//         body("note").optional().isString(),
//         body("sale_id").optional().isInt(),
//         body("direct_request_id").optional().isInt(),
//     ]),
//     async (req: CustomRequest, res: Response) => {
//         // if (req.user?.user_role !== "TELEMARKETER" && req.user?.user_role !== "SALES01" && req.user?.user_role !== "SALES02") {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Only telemarketers or sales users can create reminders"});
//         // }
//         try {
//             const {task_title, task_date, note, sale_id, direct_request_id} = req.body;
//
//             if (!sale_id && !direct_request_id) {
//                 return res.status(httpStatus.BAD_REQUEST).json({message: "Either sale_id or direct_request_id is required"});
//             }
//
//             if (sale_id) {
//                 const sale = await FastTrackSale.findByPk(sale_id);
//                 if (!sale) {
//                     return res.status(httpStatus.NOT_FOUND).json({message: "Sale not found"});
//                 }
//             } else {
//                 const directRequest = await FastTrackRequest.findByPk(direct_request_id);
//                 if (!directRequest) {
//                     return res.status(httpStatus.NOT_FOUND).json({message: "Direct request not found"});
//                 }
//             }
//
//             const reminder = await FastTrackReminder.create({
//                 task_title,
//                 task_date,
//                 note,
//                 sale_id,
//                 direct_request_id,
//             });
//
//             res.status(httpStatus.CREATED).json({message: "Reminder created", reminder});
//         } catch (err) {
//             console.error("createReminder error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const getBestMatches = [
//     validate([param("directRequestId").isInt()]),
//     async (req: CustomRequest, res: Response) => {
//         // if (req.user?.user_role !== "TELEMARKETER") {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Only telemarketers can view best matches"});
//         // }
//         try {
//             const directRequestId = parseInt(req.params.directRequestId, 10);
//
//             const directRequest = await FastTrackRequest.findByPk(directRequestId);
//             if (!directRequest) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Direct request not found"});
//             }
//
//             const vehicles = await VehicleListing.findAll({
//                 where: {
//                     type: directRequest.vehicle_type,
//                     make: directRequest.vehicle_make,
//                     model: directRequest.vehicle_model,
//                     grade: directRequest.grade,
//                     manufacture_year: directRequest.manufacture_year,
//                     mileage: {[Op.between]: [directRequest.mileage_min, directRequest.mileage_max]},
//                     no_of_owners: {[Op.lte]: directRequest.no_of_owners},
//                     price: {[Op.between]: [directRequest.price_from, directRequest.price_to]},
//                 },
//             });
//
//             const bestMatches = await Promise.all(
//                 vehicles.map(async (vehicle) => {
//                     const existingMatch = await FastTrackBestMatch.findOne({
//                         where: {direct_request_id: directRequestId, vehicle_id: vehicle.id},
//                     });
//                     if (!existingMatch) {
//                         return FastTrackBestMatch.create({
//                             direct_request_id: directRequestId,
//                             vehicle_id: vehicle.id,
//                             estimate_price: vehicle.price,
//                         });
//                     }
//                     return existingMatch;
//                 })
//             );
//
//             res.status(httpStatus.OK).json(bestMatches);
//         } catch (err) {
//             console.error("getBestMatches error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const getVehicleDetails = [
//     validate([param("vehicleId").isInt()]),
//     async (req: CustomRequest, res: Response) => {
//         // if (req.user?.user_role !== "TELEMARKETER" && req.user?.user_role !== "SALES01" && req.user?.user_role !== "SALES02") {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Only telemarketers or sales users can view vehicle details"});
//         // }
//         try {
//             const {vehicleId} = req.params;
//             const vehicle = await VehicleListing.findByPk(vehicleId);
//             if (!vehicle) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Vehicle not found"});
//             }
//             res.status(httpStatus.OK).json(vehicle);
//         } catch (err) {
//             console.error("getVehicleDetails error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const assignSale = [
//     validate([
//         param("directRequestId").isInt(),
//         param("vehicleId").isInt(),
//         body("salesUserId").isInt(),
//     ]),
//     async (req: CustomRequest, res: Response) => {
//         // if (req.user?.user_role !== "TELEMARKETER") {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Only telemarketers can assign sales"});
//         // }
//         try {
//             const {salesUserId} = req.body;
//
//             const directRequestId = parseInt(req.params.directRequestId, 10);
//             const vehicleId = parseInt(req.params.vehicleId, 10);
//
//             const directRequest = await FastTrackRequest.findByPk(directRequestId);
//             if (!directRequest) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Direct request not found"});
//             }
//
//             const vehicle = await VehicleListing.findByPk(vehicleId);
//             if (!vehicle) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Vehicle not found"});
//             }
//
//             const salesUser = await db.User.findByPk(salesUserId);
//             if (!salesUser || !["SALES01", "SALES02"].includes(salesUser.user_role)) {
//                 return res.status(httpStatus.BAD_REQUEST).json({message: "Invalid sales user"});
//             }
//
//             const sale = await FastTrackSale.create({
//                 ticket_number: `IMS${Date.now()}`,
//                 customer_id: directRequest.customer_id,
//                 vehicle_id: vehicleId,
//                 direct_request_id: directRequestId,
//                 call_agent_id: directRequest.call_agent_id,
//                 assigned_sales_id: salesUserId,
//                 status: "NEW",
//                 price_range_min: directRequest.price_from,
//                 price_range_max: directRequest.price_to,
//                 additional_note: null,
//             });
//
//             await directRequest.update({status: "ASSIGNED"});
//
//             res.status(httpStatus.CREATED).json({message: "Sale assigned", sale});
//         } catch (err) {
//             console.error("assignSale error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const assignToMe = [
//     validate([param("saleId").isInt()]),
//     async (req: CustomRequest, res: Response) => {
//         // if (req.user?.user_role !== "SALES01" && req.user?.user_role !== "SALES02") {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Only sales users can claim sales"});
//         // }
//         try {
//             const {saleId} = req.params;
//             const sale = await FastTrackSale.findByPk(saleId);
//             if (!sale) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Sale not found"});
//             }
//             if (sale.assigned_sales_id !== req.user?.id) {
//                 return res.status(httpStatus.FORBIDDEN).json({message: "Sale not assigned to this user"});
//             }
//             await sale.update({status: "ONGOING"});
//             res.status(httpStatus.OK).json({message: "Sale claimed", sale});
//         } catch (err) {
//             console.error("assignToMe error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const createFollowup = [
//     validate([
//         body("sale_id").isInt(),
//         body("activity").isString().notEmpty(),
//         body("activity_date").isISO8601().toDate(),
//     ]),
//     async (req: CustomRequest, res: Response) => {
//         // if (req.user?.user_role !== "SALES01" && req.user?.user_role !== "SALES02") {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Only sales users can create followups"});
//         // }
//         try {
//             const {sale_id, activity, activity_date} = req.body;
//             const sale = await FastTrackSale.findByPk(sale_id);
//             if (!sale) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Sale not found"});
//             }
//             const followup = await FastTrackFollowup.create({
//                 sale_id,
//                 activity,
//                 activity_date,
//             });
//             res.status(httpStatus.CREATED).json({message: "Followup created", followup});
//         } catch (err) {
//             console.error("createFollowup error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const getSaleByTicket = [
//     validate([param("ticket").isString().notEmpty()]),
//     async (req: CustomRequest, res: Response) => {
//         // if (!["SALES01", "SALES02", "TELEMARKETER", "ADMIN"].includes(req.user?.user_role || "")) {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Access denied"});
//         // }
//         try {
//             const {ticket} = req.params;
//             const sale = await FastTrackSale.findOne({
//                 where: {ticket_number: ticket},
//                 include: [
//                     {model: Customer, as: "customer"},
//                     {model: VehicleListing, as: "vehicle"},
//                     {model: User, as: "callAgent", attributes: ["id", "full_name"]},
//                     {model: User, as: "salesUser", attributes: ["id", "full_name"]},
//                     {model: FastTrackFollowup, as: "followups", order: [["activity_date", "DESC"]]},
//                     {model: FastTrackReminder, as: "reminders", order: [["task_date", "ASC"]]},
//                 ],
//             });
//             if (!sale) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Sale not found"});
//             }
//             res.status(httpStatus.OK).json(sale);
//         } catch (err) {
//             console.error("getSaleByTicket error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const getRemindersByDirectRequest = [
//     validate([param("directRequestId").isInt()]),
//     async (req: CustomRequest, res: Response) => {
//         // if (req.user?.user_role !== "TELEMARKETER") {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Only telemarketers can view reminders"});
//         // }
//         try {
//             const {directRequestId} = req.params;
//             const directRequest = await FastTrackRequest.findByPk(directRequestId);
//             if (!directRequest) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Direct request not found"});
//             }
//             const reminders = await FastTrackReminder.findAll({
//                 where: {direct_request_id: directRequestId},
//                 order: [["task_date", "ASC"]],
//             });
//             res.status(httpStatus.OK).json(reminders);
//         } catch (err) {
//             console.error("getRemindersByDirectRequest error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const getRemindersBySale = [
//     validate([param("saleId").isInt()]),
//     async (req: CustomRequest, res: Response) => {
//         // if (!["SALES01", "SALES02", "TELEMARKETER"].includes(req.user?.user_role || "")) {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Access denied"});
//         // }
//         try {
//             const {saleId} = req.params;
//             const sale = await FastTrackSale.findByPk(saleId);
//             if (!sale) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Sale not found"});
//             }
//             const reminders = await FastTrackReminder.findAll({
//                 where: {sale_id: saleId},
//                 order: [["task_date", "ASC"]],
//             });
//             res.status(httpStatus.OK).json(reminders);
//         } catch (err) {
//             console.error("getRemindersBySale error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const getFollowupsBySale = [
//     validate([param("saleId").isInt()]),
//     async (req: CustomRequest, res: Response) => {
//         // if (!["SALES01", "SALES02", "TELEMARKETER"].includes(req.user?.user_role || "")) {
//         //     return res.status(httpStatus.FORBIDDEN).json({message: "Access denied"});
//         // }
//         try {
//             const {saleId} = req.params;
//             const sale = await FastTrackSale.findByPk(saleId);
//             if (!sale) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Sale not found"});
//             }
//             const followups = await FastTrackFollowup.findAll({
//                 where: {sale_id: saleId},
//                 order: [["activity_date", "DESC"]],
//             });
//             res.status(httpStatus.OK).json(followups);
//         } catch (err) {
//             console.error("getFollowupsBySale error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const listSales = [
//     validate([
//         query("status").optional().isIn(["NEW", "ONGOING", "WIN", "LOST"]),
//         query("assigned_sales_id").optional().isInt(),
//     ]),
//     async (req: CustomRequest, res: Response) => {
//         // if (!["SALES01", "SALES02", "TELEMARKETER", "ADMIN"].includes(req.user?.user_role || "")) {
//         //     return res.status(httpStatus.FORBIDDEN).json({ message: "Access denied" });
//         // }
//         try {
//             const {status, assigned_sales_id} = req.query;
//             const where: any = {};
//             if (status) where.status = status;
//             if (assigned_sales_id) where.assigned_sales_id = assigned_sales_id;
//
//             const sales = await FastTrackSale.findAll({
//                 where,
//                 include: [
//                     {model: Customer, as: "customers", attributes: ["id", "name", "contact_no"]},
//                     {model: User, as: "salesUser", attributes: ["id", "full_name"]},
//                 ],
//                 order: [["createdAt", "DESC"]],
//             });
//
//             res.status(httpStatus.OK).json(sales);
//         } catch (err) {
//             console.error("listSales error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const updateSaleStatus = [
//     validate([
//         param("saleId").isInt(),
//         body("status").isIn(["NEW", "ONGOING", "WIN", "LOST"]),
//     ]),
//     async (req: CustomRequest, res: Response) => {
//         // if (!["SALES01", "SALES02"].includes(req.user?.user_role || "")) {
//         //     return res.status(httpStatus.FORBIDDEN).json({ message: "Only sales users can update sale status" });
//         // }
//         try {
//             const {saleId} = req.params;
//             const {status} = req.body;
//
//             const sale = await FastTrackSale.findByPk(saleId);
//             if (!sale) {
//                 return res.status(httpStatus.NOT_FOUND).json({message: "Sale not found"});
//             }
//
//             await sale.update({status});
//
//             res.status(httpStatus.OK).json({message: "Sale status updated", sale});
//         } catch (err) {
//             console.error("updateSaleStatus error:", err);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Server error"});
//         }
//     },
// ];
//
// export const getNearestRemindersBySalesUser = async (req: Request, res: Response) => {
//     try {
//         const {userId} = req.params;
//
//         if (!userId) {
//             return res.status(400).json({message: "User ID is required"});
//         }
//
//         const salesWithReminders = await FastTrackSale.findAll({
//             where: {assigned_sales_id: userId},
//             include: [
//                 {
//                     model: FastTrackReminder,
//                     as: "reminders",
//                     where: {
//                         task_date: {
//                             [Op.gte]: new Date(),
//                         },
//                     },
//                     required: true,
//                     order: [["task_date", "ASC"]],
//                 },
//                 {
//                     model: Customer,
//                     as: "customer",
//                     attributes: ["customer_name", "phone_number", "email"],
//                 },
//             ],
//             order: [[{model: FastTrackReminder, as: "reminders"}, "task_date", "ASC"]],
//         });
//
//         const nearestReminders = salesWithReminders.flatMap((sale: any) =>
//             sale.reminders.map((reminder: any) => ({
//                 reminder_id: reminder.id,
//                 task_title: reminder.task_title,
//                 task_date: reminder.task_date,
//                 note: reminder.note,
//                 sale_id: sale.id,
//                 ticket_number: sale.ticket_number,
//                 customer_name: sale.customer?.customer_name,
//                 contact_number: sale.customer?.phone_number,
//             }))
//         );
//
//         nearestReminders.sort(
//             (a, b) => new Date(a.task_date).getTime() - new Date(b.task_date).getTime()
//         );
//
//         return res.status(200).json({data: nearestReminders});
//     } catch (error: any) {
//         console.error("getNearestRemindersBySalesUser error:", error);
//         return res
//             .status(500)
//             .json({message: "Internal server error", error: error.message});
//     }
// };


import {Request, Response} from "express";
import {Op} from "sequelize";
import db from "../models";
import http from "http-status-codes";

const {
    Customer,
    User,
    VehicleListing,
    FastTrackRequest,
    FastTrackBestMatch,
    FastTrackSale,
    FastTrackFollowup,
    FastTrackReminder,
} = db;

/** 1) Call agent creates a direct request */
export const createDirectRequest = async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        const exists = await Customer.findByPk(payload.customer_id);
        if (!exists) return res.status(http.NOT_FOUND).json({message: "Customer not found"});

        const rec = await FastTrackRequest.create({
            ...payload,
            status: "PENDING",
        });

        return res.status(http.CREATED).json(rec);
    } catch (e) {
        console.error("createDirectRequest", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 2) Telemarketer lists requests with basic filters */
export const listDirectRequests = async (req: Request, res: Response) => {
    try {
        const {status, vehicle_type, vehicle_make, vehicle_model} = req.query;
        const where: any = {};
        if (status) where.status = String(status);
        if (vehicle_type) where.vehicle_type = String(vehicle_type);
        if (vehicle_make) where.vehicle_make = String(vehicle_make);
        if (vehicle_model) where.vehicle_model = String(vehicle_model);

        const rows = await FastTrackRequest.findAll({
            where,
            include: [
                {model: Customer, as: "customer"},
                {model: User, as: "callAgent", attributes: ["id", "full_name"]},
                {model: FastTrackReminder, as: "directReminders"},
            ],
            order: [["createdAt", "DESC"]],
        });

        return res.status(http.OK).json(rows);
    } catch (e) {
        console.error("listDirectRequests", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 3) Telemarketer adds a reminder to a direct request */
export const addDirectRequestReminder = async (req: Request, res: Response) => {
    try {
        const direct_request_id = Number(req.params.directRequestId);
        const dr = await FastTrackRequest.findByPk(direct_request_id);
        if (!dr) return res.status(http.NOT_FOUND).json({message: "Direct request not found"});

        const {task_title, task_date, note} = req.body;
        const r = await FastTrackReminder.create({direct_request_id, task_title, task_date, note});
        return res.status(http.CREATED).json(r);
    } catch (e) {
        console.error("addDirectRequestReminder", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 4) Find and persist best matches for a request */
export const buildBestMatches = async (req: Request, res: Response) => {
    try {
        const direct_request_id = Number(req.params.directRequestId);
        const dr = await FastTrackRequest.findByPk(direct_request_id);
        if (!dr) return res.status(http.NOT_FOUND).json({message: "Direct request not found"});

        const vehicles = await VehicleListing.findAll({
            where: {
                type: dr.vehicle_type,
                make: dr.vehicle_make,
                model: dr.vehicle_model,
                grade: dr.grade,
                manufacture_year: dr.manufacture_year,
                mileage: {[Op.between]: [dr.mileage_min, dr.mileage_max]},
                no_of_owners: {[Op.lte]: dr.no_of_owners},
                price: {[Op.between]: [dr.price_from, dr.price_to]},
            },
        });

        const createdOrExisting = await Promise.all(
            vehicles.map(async (v: any) => {
                const existing = await FastTrackBestMatch.findOne({
                    where: {direct_request_id, vehicle_id: v.id},
                });
                if (existing) return existing;
                return FastTrackBestMatch.create({
                    direct_request_id,
                    vehicle_id: v.id,
                    estimate_price: v.price,
                });
            })
        );

        return res.status(http.OK).json(createdOrExisting);
    } catch (e) {
        console.error("buildBestMatches", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 5) Vehicle quick view for a best match */
export const getVehicleDetails = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.vehicleId);
        const v = await VehicleListing.findByPk(id);
        if (!v) return res.status(http.NOT_FOUND).json({message: "Vehicle not found"});
        return res.status(http.OK).json(v);
    } catch (e) {
        console.error("getVehicleDetails", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 6) Assign a best match to sales. Creates NEW lead. Marks DR as ASSIGNED. */
export const assignBestMatchToSale = async (req: Request, res: Response) => {
    try {
        const direct_request_id = Number(req.params.directRequestId);
        const vehicle_id = Number(req.params.vehicleId);
        const {salesUserId} = req.body;

        const dr = await FastTrackRequest.findByPk(direct_request_id);
        if (!dr) return res.status(http.NOT_FOUND).json({message: "Direct request not found"});

        const v = await VehicleListing.findByPk(vehicle_id);
        if (!v) return res.status(http.NOT_FOUND).json({message: "Vehicle not found"});

        const sale = await FastTrackSale.create({
            ticket_number: `IMS${Date.now()}`,
            customer_id: dr.customer_id,
            vehicle_id,
            direct_request_id,
            call_agent_id: dr.call_agent_id,
            assigned_sales_id: salesUserId,
            status: "NEW",
            price_range_min: dr.price_from,
            price_range_max: dr.price_to,
            additional_note: null,
            priority: 0,
        });

        await dr.update({status: "ASSIGNED"});

        return res.status(http.CREATED).json(sale);
    } catch (e) {
        console.error("assignBestMatchToSale", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 7) Sales user claims a lead */
export const claimSaleLead = async (req: Request, res: Response) => {
    try {
        const saleId = Number(req.params.saleId);
        const {userId} = req.body;

        const sale = await FastTrackSale.findByPk(saleId);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.assigned_sales_id = userId;
        sale.status = "ONGOING";
        await sale.save();

        return res.status(http.OK).json(sale);
    } catch (e) {
        console.error("claimSaleLead", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 8) Update sale status to WON or LOST */
export const updateSaleStatus = async (req: Request, res: Response) => {
    try {
        const saleId = Number(req.params.saleId);
        const {status} = req.body as { status: "WON" | "LOST" };

        if (!["WON", "LOST"].includes(status))
            return res.status(http.BAD_REQUEST).json({message: "Invalid status"});

        const sale = await FastTrackSale.findByPk(saleId);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});
        if (sale.status !== "ONGOING")
            return res.status(http.BAD_REQUEST).json({message: "Only ONGOING can be closed"});

        sale.status = status;
        await sale.save();
        return res.status(http.OK).json(sale);
    } catch (e) {
        console.error("updateSaleStatus", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 9) Update sale priority (integer) */
export const updateSalePriority = async (req: Request, res: Response) => {
    try {
        const saleId = Number(req.params.saleId);
        const {priority} = req.body as { priority: number };

        const sale = await FastTrackSale.findByPk(saleId);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        sale.priority = Number.isFinite(priority) ? priority : 0;
        await sale.save();
        return res.status(http.OK).json(sale);
    } catch (e) {
        console.error("updateSalePriority", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 10) Create sale followup */
export const createSaleFollowup = async (req: Request, res: Response) => {
    try {
        const {sale_id, activity, activity_date} = req.body;
        const sale = await FastTrackSale.findByPk(sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const f = await FastTrackFollowup.create({sale_id, activity, activity_date});
        return res.status(http.CREATED).json(f);
    } catch (e) {
        console.error("createSaleFollowup", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 11) Create sale reminder */
export const createSaleReminder = async (req: Request, res: Response) => {
    try {
        const {sale_id, task_title, task_date, note} = req.body;
        const sale = await FastTrackSale.findByPk(sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const r = await FastTrackReminder.create({sale_id, task_title, task_date, note});
        return res.status(http.CREATED).json(r);
    } catch (e) {
        console.error("createSaleReminder", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

/** 12) Lookups */
export const getSaleByTicket = async (req: Request, res: Response) => {
    try {
        const {ticket} = req.params;
        const sale = await FastTrackSale.findOne({
            where: {ticket_number: ticket},
            include: [
                {model: Customer, as: "customer"},
                {model: VehicleListing, as: "vehicle"},
                {model: FastTrackFollowup, as: "followups"},
                {model: FastTrackReminder, as: "saleReminders"},
            ],
        });
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});
        return res.status(http.OK).json(sale);
    } catch (e) {
        console.error("getSaleByTicket", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const listSales = async (req: Request, res: Response) => {
    try {
        const {status, assigned_sales_id} = req.query;
        const where: any = {};
        if (status) where.status = String(status);
        if (assigned_sales_id) where.assigned_sales_id = Number(assigned_sales_id);

        const rows = await FastTrackSale.findAll({
            where,
            include: [
                {model: Customer, as: "customer"},
                {model: VehicleListing, as: "vehicle"},
                {model: User, as: "salesUser", attributes: ["id", "full_name"]},
            ],
            order: [["createdAt", "DESC"]],
        });

        return res.status(http.OK).json(rows);
    } catch (e) {
        console.error("listSales", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getDirectReminders = async (req: Request, res: Response) => {
    try {
        const direct_request_id = Number(req.params.directRequestId);
        const dr = await FastTrackRequest.findByPk(direct_request_id);
        if (!dr) return res.status(http.NOT_FOUND).json({message: "Direct request not found"});

        const rows = await FastTrackReminder.findAll({
            where: {direct_request_id},
            order: [["task_date", "ASC"]],
        });
        return res.status(http.OK).json(rows);
    } catch (e) {
        console.error("getDirectReminders", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getAllDirectReminders = async (req: Request, res: Response) => { // NEW: All reminders
    try {
        const rows = await FastTrackReminder.findAll({
            where: {sale_id: null},
            include: [
                {
                    model: FastTrackRequest,
                    as: "directRequest",
                    include: [{model: Customer, as: "customer"}],
                },
            ],
            order: [["task_date", "ASC"]],
        });
        return res.status(http.OK).json(rows);
    } catch (e) {
        console.error("getAllDirectReminders", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getBestMatches = async (req: Request, res: Response) => { // NEW: Get with vehicles
    try {
        const direct_request_id = Number(req.params.directRequestId);
        const dr = await FastTrackRequest.findByPk(direct_request_id);
        if (!dr) return res.status(http.NOT_FOUND).json({message: "Direct request not found"});
        const rows = await FastTrackBestMatch.findAll({
            where: {direct_request_id},
            include: [{model: VehicleListing, as: "vehicle"}],
        });
        return res.status(http.OK).json(rows);
    } catch (e) {
        console.error("getBestMatches", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const getSaleReminders = async (req: Request, res: Response) => {
    try {
        const sale_id = Number(req.params.saleId);
        const sale = await FastTrackSale.findByPk(sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const rows = await FastTrackReminder.findAll({
            where: {sale_id},
            order: [["task_date", "ASC"]],
        });
        return res.status(http.OK).json(rows);
    } catch (e) {
        console.error("getSaleReminders", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getSaleFollowups = async (req: Request, res: Response) => {
    try {
        const sale_id = Number(req.params.saleId);
        const sale = await FastTrackSale.findByPk(sale_id);
        if (!sale) return res.status(http.NOT_FOUND).json({message: "Sale not found"});

        const rows = await FastTrackFollowup.findAll({
            where: {sale_id},
            order: [["activity_date", "DESC"]],
        });
        return res.status(http.OK).json(rows);
    } catch (e) {
        console.error("getSaleFollowups", e);
        return res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};
