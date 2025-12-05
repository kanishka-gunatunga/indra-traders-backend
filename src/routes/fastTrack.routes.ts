// import {Router} from "express";
// import {
//     assignSale, assignToMe,
//     createDirectRequest, createFollowup,
//     createReminder, getBestMatches, getFollowupsBySale,
//     getRemindersByDirectRequest, getRemindersBySale, getSaleByTicket, getVehicleDetails,
//     listDirectRequests, listSales, updateSaleStatus
// } from "../controllers/fastTrack.controller";
// import {getNearestRemindersBySalesUser} from "../controllers/vehicleSale.controller";
//
//
// const router = Router();
//
// // const authMiddleware = (req: any, res: any, next: any) => {
// //     if (!req.user) {
// //         return res.status(401).json({ message: "Unauthorized" });
// //     }
// //     next();
// // };
// //
// // router.use(authMiddleware);
//
//
// router.post("/direct-requests", createDirectRequest);
// router.get("/direct-requests", listDirectRequests);
// router.get("/sales", listSales);
// router.put(`/sales/:saleId/status`, updateSaleStatus);
//
//
// router.post("/reminders", createReminder);
// router.get("/direct-requests/:directRequestId/reminders", getRemindersByDirectRequest);
// router.get("/sales/:saleId/reminders", getRemindersBySale);
//
// router.get("/direct-requests/:directRequestId/best-matches", getBestMatches);
//
// router.get("/vehicles/:vehicleId", getVehicleDetails);
//
// router.post("/direct-requests/:directRequestId/vehicles/:vehicleId/assign", assignSale);
// router.put("/sales/:saleId/assign-to-me", assignToMe);
// router.get("/sales/ticket/:ticket", getSaleByTicket);
//
// router.post("/followups", createFollowup);
// router.get("/sales/:saleId/followups", getFollowupsBySale);
// router.get("/sales-user/:userId/reminders/nearest", getNearestRemindersBySalesUser);
//
//
// export default router;

import {Router} from "express";
import * as FT from "../controllers/fastTrack.controller";

const r = Router();

// Direct Requests (call agent creates, telemarketer works)
r.post("/direct-requests", FT.createDirectRequest);
r.get("/direct-requests", FT.listDirectRequests);

r.post("/direct-requests/:directRequestId/reminders", FT.addDirectRequestReminder);
r.get("/direct-requests/:directRequestId/reminders", FT.getDirectReminders);

r.post("/direct-requests/:directRequestId/best-matches/build", FT.buildBestMatches);
r.post("/direct-requests/:directRequestId/assign/:vehicleId", FT.assignBestMatchToSale);

// Vehicle details for a best match
r.get("/vehicles/:vehicleId", FT.getVehicleDetails);

// Sales leads
r.get("/sales", FT.listSales);
r.get("/sales/ticket/:ticket", FT.getSaleByTicket);
r.post("/sales/:saleId/claim", FT.claimSaleLead);
r.patch("/sales/:saleId/status", FT.updateSaleStatus);
r.patch("/sales/:saleId/priority", FT.updateSalePriority);

// Sales activities
r.post("/sales/followups", FT.createSaleFollowup);
r.get("/sales/:saleId/followups", FT.getSaleFollowups);

r.post("/sales/reminders", FT.createSaleReminder);
r.get("/sales/:saleId/reminders", FT.getSaleReminders);

r.get("/direct-requests/reminders", FT.getAllDirectReminders); // NEW: All reminders
r.get("/direct-requests/:directRequestId/best-matches", FT.getBestMatches);

r.get("/sales/:id/history", FT.getSaleHistory);
r.put("/sales/:id/promote", FT.promoteToNextLevel);

r.post("/sales/create-direct", FT.createSaleDirect);

export default r;
