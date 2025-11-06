import express from "express";
import {
    createUnavailableVehicleSale,
    getAllUnavailableVehicleSales,
    getUnavailableVehicleSaleById,
    createUnavailableSparePart,
    createUnavailableService,
    getAllUnavailableSpareParts,
    getAllUnavailableServices,
    getUnavailableServiceById,
    getUnavailableSparePartById
} from "../controllers/unavailable.controller";

const router = express.Router();

router.post("/vehicle-sales", createUnavailableVehicleSale);
router.get("/vehicle-sales", getAllUnavailableVehicleSales);
router.get("/vehicle-sales/:id", getUnavailableVehicleSaleById);

router.post("/services", createUnavailableService);
router.get("/services", getAllUnavailableServices);
router.get("/services/:id", getUnavailableServiceById);

router.post("/spare-parts", createUnavailableSparePart);
router.get("/spare-parts", getAllUnavailableSpareParts);
router.get("spare-parts/:id", getUnavailableSparePartById);


export default router;
