import {Router} from "express";
import {
    createFollowUp,
    getFollowUpsBySaleId,
    getFollowUpsByTicket,
    deleteFollowUp
} from "../controllers/vehicleSaleFollowup.controller";

const router = Router();

router.post("/", createFollowUp);
router.get("/:vehicleSaleId", getFollowUpsBySaleId);
router.get("/ticket/:ticketNumber", getFollowUpsByTicket);
router.delete("/:id", deleteFollowUp);

export default router;
