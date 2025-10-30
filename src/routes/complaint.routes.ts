import { Router } from "express";
import {
    createComplaint,
    getAllComplaints,
    getComplaintById,
    getComplaintsByContact,
    updateComplaint,
} from "../controllers/complaint.controller";

const router = Router();

router.post("/", createComplaint);
router.get("/", getAllComplaints);
router.get("/:id", getComplaintById);
router.get("/customer/:phone_number", getComplaintsByContact);
router.put("/:id", updateComplaint);

export default router;
