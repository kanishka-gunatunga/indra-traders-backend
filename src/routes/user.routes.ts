import { Router } from "express";
import {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser, login, checkUserHandoverRequirements, getProfile, updateProfile,
} from "../controllers/user.controller";
import { verifyToken } from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.post("/", createUser);
router.get("/", getUsers);

router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

router.get("/:id", getUserById);

router.get("/:id/handover-check", checkUserHandoverRequirements);

router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
