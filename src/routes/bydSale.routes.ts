import express from "express";
import {
    createBydSale,
    getBydSales,
    getBydSaleById,
    updateBydSaleStatus,
    assignBydSale,
    createBydFollowUp,
    getBydFollowUpsBySaleId,
    deleteBydFollowUp,
    createBydReminder,
    getBydRemindersBySaleId,
    deleteBydReminder,
    promoteToNextLevel,
    getSaleHistory,
    getNearestRemindersBySalesUser,
    getBydSaleByTicket,
    updateBydSalePriority,
    createBydUnavailableSale,
    getAllBydUnavailableSales
} from "../controllers/bydSale.controller";


const router = express.Router();

// Unavailable
router.post("/unavailable", createBydUnavailableSale);
router.get("/unavailable", getAllBydUnavailableSales);

// Sales Endpoints
router.post("/", createBydSale);
router.get("/", getBydSales);
router.get("/:id", getBydSaleById);
router.get("/ticket/:ticketNumber", getBydSaleByTicket);
router.put("/:id/status", updateBydSaleStatus);
router.put("/:id/priority", updateBydSalePriority);
router.put("/:id/assign", assignBydSale);
router.get("/sales-user/:userId/reminders/nearest", getNearestRemindersBySalesUser);

router.put("/:id/promote", promoteToNextLevel);
router.get("/:id/history", getSaleHistory);

// Followup Endpoints
router.post("/followups", createBydFollowUp);
router.get("/followups/sale/:bydSaleId", getBydFollowUpsBySaleId);
router.delete("/followups/:id", deleteBydFollowUp);

// Reminder Endpoints
router.post("/reminders", createBydReminder);
router.get("/reminders/sale/:bydSaleId", getBydRemindersBySaleId);
router.delete("/reminders/:id", deleteBydReminder);



export default router;
