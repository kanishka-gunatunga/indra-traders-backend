import {Router} from "express";
import {
    createAssignToSale,
    assignToSalesAgent,
    getSaleDetails,
    handleServiceIntake,
    listVehicleHistories,
    getVehicleHistoryByNumber,
    listServiceParkSales,
    getSaleDetailsByTicket,
    updateSaleStatus,
    createFollowup,
    createReminder,
    getNearestRemindersBySalesUser,
    updatePriority,
    getSaleHistory,
    promoteToNextLevel,
    createPackage,
    createService,
    createServiceLine,
    createBranch,
    getAllServices,
    addServiceToBranch,
    getBranchDetails,
    listBranches,
    updateService,
    updatePackage,
    deleteService,
    deletePackage,
    getAllPackages, updateBranch, deleteBranch,
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


router.post("/services", createService);
router.get("/services", getAllServices);
router.put("/services/:id", updateService);
router.delete("/services/:id", deleteService);
router.post("/packages", createPackage);
router.get("/packages", getAllPackages);
router.put("/packages/:id", updatePackage);
router.delete("/packages/:id", deletePackage);

// Branch Management
router.post("/branches", createBranch);
router.get("/branches", listBranches);
router.get("/branches/:id", getBranchDetails); // View More functionality

router.put("/branches/:id", updateBranch);
router.delete("/branches/:id", deleteBranch);

// Branch Specific Config
router.post("/branches/:branchId/services", addServiceToBranch); // Add price to service in branch
router.post("/branches/:branchId/lines", createServiceLine); // Add booth/line with advisor


router.get("/sales/:ticketNumber", getSaleDetailsByTicket);
router.put("/sales/:id/status", updateSaleStatus)
router.get("/:vehicleNo", getVehicleHistoryByNumber);
router.get("/sales-user/:userId/reminders/nearest", getNearestRemindersBySalesUser);

router.put("/priority/:id", updatePriority);

router.get("/:id/history", getSaleHistory);
router.put("/:id/promote", promoteToNextLevel);


export default router;
