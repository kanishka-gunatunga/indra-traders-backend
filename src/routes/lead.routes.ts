import express from "express";
import { getAllLeads, getEligibleSalesAgents, assignLead } from "../controllers/lead.controller";

const router = express.Router();

router.get("/", getAllLeads);
router.get("/agents", getEligibleSalesAgents);
router.post("/assign", assignLead);

export default router;
