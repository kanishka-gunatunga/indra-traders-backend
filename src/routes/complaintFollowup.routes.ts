import {Router} from "express";
import {
    createFollowUp,
    getAllFollowUps,
    getFollowUpsByComplaint,
    updateFollowUp,
    deleteFollowUp,
} from "../controllers/complaintFollowup.controller";

const router = Router();

router.post("/", createFollowUp);
router.get("/", getAllFollowUps);
router.get("/complaint/:complaintId", getFollowUpsByComplaint);
router.put("/:id", updateFollowUp);
router.delete("/:id", deleteFollowUp);


export default router;
