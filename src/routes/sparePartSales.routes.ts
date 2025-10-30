import {Router} from "express";
import {
    createSale,
    listSales,
    getSaleByTicket,
    assignToSales,
    assignToMe,
    createFollowup,
    createReminder, getFollowupsByTicket, getRemindersByTicket, updateSaleStatus, getNearestRemindersBySalesUser
} from "../controllers/sparePartSales.controller";

const router = Router();

router.post("/", createSale);
router.get("/", listSales);
router.get("/ticket/:ticket", getSaleByTicket);
router.put("/:id/assign", assignToSales);
router.put("/:id/claim", assignToMe);
router.put("/:id/status", updateSaleStatus);

router.post("/followups", createFollowup);
router.post("/reminders", createReminder);
router.get("/:ticket/followups", getFollowupsByTicket);
router.get("/:ticket/reminders", getRemindersByTicket);
router.get("/sales-user/:userId/reminders/nearest", getNearestRemindersBySalesUser);

export default router;
