import { Router } from "express";
import { getServiceTypes, getBookings, getBookingById, createBooking, updateBooking } from "../controllers/serviceCenter.controller";

const router = Router();

router.get("/service-types", getServiceTypes);
router.get("/bookings", getBookings);
router.get("/bookings/:id", getBookingById);
router.post("/bookings", createBooking);
router.put("/bookings/:id", updateBooking);

export default router;