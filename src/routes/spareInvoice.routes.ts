import {Router} from "express";
import {invoiceDetails, lastPurchases} from "../controllers/spareInvoice.controller";


const router = Router();
router.get("/recent", lastPurchases);
router.get("/:invoiceNo", invoiceDetails);

export default router;
