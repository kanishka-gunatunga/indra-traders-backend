import { Router } from "express";
import { serviceBookingLogin, getServiceBookingBranches } from "../controllers/serviceBookingAuth.controller";

const router = Router();

router.post("/login", serviceBookingLogin);
router.get("/branches", getServiceBookingBranches);

export default router;