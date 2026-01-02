import express from "express";
import { getDashboardMetrics } from "../controllers/dashboard.controller";

const router = express.Router();

router.get("/metrics", getDashboardMetrics);

export default router;