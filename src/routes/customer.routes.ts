import { Router } from "express";
import { getCustomers, updateCustomer } from "../controllers/customer.controller";

const router = Router();

router.get("/", getCustomers);
router.put("/:id", updateCustomer);

export default router;
