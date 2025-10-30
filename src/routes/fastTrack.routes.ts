import {Router} from "express";
import {
    assignSale, assignToMe,
    createDirectRequest, createFollowup,
    createReminder, getBestMatches, getFollowupsBySale,
    getRemindersByDirectRequest, getRemindersBySale, getSaleByTicket, getVehicleDetails,
    listDirectRequests, listSales, updateSaleStatus
} from "../controllers/fastTrack.controller";
import {getNearestRemindersBySalesUser} from "../controllers/vehicleSale.controller";


const router = Router();

// const authMiddleware = (req: any, res: any, next: any) => {
//     if (!req.user) {
//         return res.status(401).json({ message: "Unauthorized" });
//     }
//     next();
// };
//
// router.use(authMiddleware);


router.post("/direct-requests", createDirectRequest);
router.get("/direct-requests", listDirectRequests);
router.get("/sales", listSales);
router.put(`/sales/:saleId/status`, updateSaleStatus);


router.post("/reminders", createReminder);
router.get("/direct-requests/:directRequestId/reminders", getRemindersByDirectRequest);
router.get("/sales/:saleId/reminders", getRemindersBySale);

router.get("/direct-requests/:directRequestId/best-matches", getBestMatches);

router.get("/vehicles/:vehicleId", getVehicleDetails);

router.post("/direct-requests/:directRequestId/vehicles/:vehicleId/assign", assignSale);
router.put("/sales/:saleId/assign-to-me", assignToMe);
router.get("/sales/ticket/:ticket", getSaleByTicket);

router.post("/followups", createFollowup);
router.get("/sales/:saleId/followups", getFollowupsBySale);
router.get("/sales-user/:userId/reminders/nearest", getNearestRemindersBySalesUser);


export default router;