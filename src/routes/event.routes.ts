import { Router } from "express";
import {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    getEventsByCustomerId,
} from "../controllers/event.controller";

const router = Router();

router.post("/", createEvent);
router.get("/", getEvents);
router.get("/:id", getEventById);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);
router.get("/customer/:customerId", getEventsByCustomerId);

export default router;
