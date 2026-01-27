import express from "express";
import { getAllLeads, getEligibleSalesAgents, assignLead, updateLeadStatus } from "../controllers/lead.controller";

const router = express.Router();

router.get("/", getAllLeads);
router.get("/agents", getEligibleSalesAgents);
router.post("/assign", assignLead);
router.put("/status", updateLeadStatus);

export default router;
