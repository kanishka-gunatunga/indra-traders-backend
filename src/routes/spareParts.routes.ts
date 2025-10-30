import {Router} from "express";
import {listParts, getStockAvailability, createSparePart} from "../controllers/spareParts.controller";
import {getPromotionsForPart} from "../controllers/promotion.controller";

const router = Router();

router.get("/", listParts);
router.get("/:sparePartId/stocks", getStockAvailability);
router.get("/:sparePartId/promotions", getPromotionsForPart);
router.post("/", createSparePart);

export default router;
