import {Router} from "express";
import {getActivityLogs} from "../controllers/activityLog.controller"


const router = Router();

router.get(
    "/activity-logs",
    // authenticate,
    // authorize(["ADMIN"]),
    getActivityLogs
);

export default router;