import { Router } from "express";
import { getServiceTypes, getBookings, getAllBookings, getBookingReports, getBookingById, createBooking, updateBooking, getCalendarDots } from "../controllers/serviceCenter.controller";

const router = Router();

router.get("/service-types", getServiceTypes);
router.get("/bookings", getBookings);
router.get("/bookings/all", getAllBookings);
router.get("/bookings/reports", getBookingReports);
router.get("/bookings/calendar-dots", getCalendarDots);
router.get("/bookings/:id", getBookingById);
router.post("/bookings", createBooking);
router.put("/bookings/:id", updateBooking);

export default router;