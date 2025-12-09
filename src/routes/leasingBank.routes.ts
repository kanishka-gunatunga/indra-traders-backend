import { Router } from "express";
import {
    createBank,
    getActiveBanks,
    getAllBanks,
    updateBank,
    deleteBank
} from "../controllers/leasingBank.controller";

// import { verifyToken, isAdmin } from "../middleware/auth.middleware";

const router = Router();

router.get("/active", getActiveBanks);

// Admin Routes (Should be protected)
// router.use(verifyToken); // Uncomment when integrating auth middleware
// router.use(isAdmin);     // Uncomment when integrating auth middleware

router.get("/", getAllBanks);
router.post("/", createBank);
router.put("/:id", updateBank);
router.delete("/:id", deleteBank);

export default router;