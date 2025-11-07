import {Router} from "express";
import {
    createVehicleSale,
    getVehicleSales,
    assignVehicleSale,
    updateSaleStatus, deleteVehicleSale, getSaleByTicketID, getVehicleSalesByStatus, getNearestRemindersBySalesUser, updatePriority
} from "../controllers/vehicleSale.controller";

const router = Router();


router.post("/", createVehicleSale);
router.get("/", getVehicleSales);
router.get("/ticket/:ticketNumber", getSaleByTicketID);
router.get("/status/:status", getVehicleSalesByStatus);
router.put("/:id/assign", assignVehicleSale);
router.put("/:id/status", updateSaleStatus);
router.delete("/:id", deleteVehicleSale);
router.get("/sales-user/:userId/reminders/nearest", getNearestRemindersBySalesUser);

router.put("/priority/:id", updatePriority);

export default router;
