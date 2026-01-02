import express from "express";
import { getMyNotifications, markAsRead } from "../controllers/notification.controller";

const router = express.Router();

router.get("/:userId", getMyNotifications);

router.put("/:id/read/:userId", markAsRead);

export default router;