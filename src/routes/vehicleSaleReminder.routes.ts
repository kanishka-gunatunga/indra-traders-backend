import {Router} from "express";
import {
    createReminder,
    getRemindersBySaleId,
    getRemindersByTicket,
    deleteReminder
} from "../controllers/vehicleSaleReminder.controller";

const router = Router();

router.post("/", createReminder);
router.get("/:vehicleSaleId", getRemindersBySaleId);
router.get("/ticket/:ticketNumber", getRemindersByTicket);
router.delete("/:id", deleteReminder);

export default router;
