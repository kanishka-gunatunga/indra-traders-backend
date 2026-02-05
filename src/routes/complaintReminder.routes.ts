import { Router } from "express";
import {
    createReminder,
    getAllReminders,
    getRemindersByComplaint,
    updateReminder,
    deleteReminder,
    getNearestReminders,
} from "../controllers/complaintReminder.controller";

const router = Router();

router.post("/", createReminder);
router.get("/", getAllReminders);
router.get("/nearest", getNearestReminders);
router.get("/complaint/:complaintId", getRemindersByComplaint);
router.put("/:id", updateReminder);
router.delete("/:id", deleteReminder);


export default router;
