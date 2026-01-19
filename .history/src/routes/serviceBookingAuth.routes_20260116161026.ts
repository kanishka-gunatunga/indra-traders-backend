import { Router } from "express";
import {
  serviceBookingLogin,
  getServiceBookingBranches,
} from "../controllers/serviceBookingAuth.controller";
import { getScheduledServices } from "../controllers/serviceBooking.controller";

const router = Router();

// Auth routes
router.post("/login", serviceBookingLogin);
router.get("/branches", getServiceBookingBranches);

// Booking routes
router.get("/scheduled-services", getScheduledServices);

export default router;
