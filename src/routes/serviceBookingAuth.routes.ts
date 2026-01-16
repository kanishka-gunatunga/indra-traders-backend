import { Router } from "express";
import { serviceBookingLogin } from "../controllers/serviceBookingAuth.controller";

const router = Router();

router.post("/login", serviceBookingLogin);

export default router;