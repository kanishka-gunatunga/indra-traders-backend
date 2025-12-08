import {Router} from "express";
import {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser, login, checkUserHandoverRequirements,
} from "../controllers/user.controller";

const router = Router();

router.post("/login", login);
router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", getUserById);

router.get("/:id/handover-check", checkUserHandoverRequirements);

router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
