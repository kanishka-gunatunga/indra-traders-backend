import {Router} from "express";
import {
    createAssignToSale,
    assignToSalesAgent,
    getSaleDetails, handleServiceIntake, listVehicleHistories, getVehicleHistoryByNumber,
    listServiceParkSales, getSaleDetailsByTicket, updateSaleStatus, createFollowup, createReminder,
    getNearestRemindersBySalesUser,
    updatePriority, getSaleHistory, promoteToNextLevel
} from "../controllers/servicePark.controller";

const router = Router();

router.post("/intake", handleServiceIntake);
router.post("/assign-to-sales", createAssignToSale);
router.put("/assign-to-sales/:saleId/assign", assignToSalesAgent);
router.get("/assign-to-sales/:saleId/details", getSaleDetails);
router.get("/", listVehicleHistories);
router.get("/sales", listServiceParkSales);
router.post("/followups", createFollowup);
router.post("/reminders", createReminder);

router.get("/sales/:ticketNumber", getSaleDetailsByTicket);
router.put("/sales/:id/status", updateSaleStatus)
router.get("/:vehicleNo", getVehicleHistoryByNumber);
router.get("/sales-user/:userId/reminders/nearest", getNearestRemindersBySalesUser);

router.put("/priority/:id", updatePriority);

router.get("/:id/history", getSaleHistory);
router.put("/:id/promote", promoteToNextLevel);

export default router;
