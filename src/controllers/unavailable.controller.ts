import { Request, Response } from "express";
import db from "../models";
import http from "http-status-codes";

const { UnavailableVehicleSale, UnavailableSparePart, UnavailableService } = db;

export const createUnavailableVehicleSale = async (req: Request, res: Response) => {
    try {
        const {
            call_agent_id,
            vehicle_make,
            vehicle_model,
            manufacture_year,
            transmission,
            fuel_type,
            down_payment,
            price_from,
            price_to,
        } = req.body;

        if (
            !call_agent_id ||
            !vehicle_make ||
            !vehicle_model ||
            !manufacture_year ||
            !transmission ||
            !fuel_type ||
            !down_payment ||
            !price_from ||
            !price_to
        ) {
            return res.status(http.BAD_REQUEST).json({ message: "All fields are required" });
        }

        const sale = await UnavailableVehicleSale.create({
            call_agent_id,
            vehicle_make,
            vehicle_model,
            manufacture_year,
            transmission,
            fuel_type,
            down_payment,
            price_from,
            price_to,
        });

        res.status(http.CREATED).json(sale);
    } catch (error) {
        console.error("Error creating unavailable vehicle sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

export const getAllUnavailableVehicleSales = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await UnavailableVehicleSale.findAndCountAll({
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        res.status(http.OK).json({
            data: rows,
            meta: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching unavailable vehicle sales:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

export const getUnavailableVehicleSaleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const record = await UnavailableVehicleSale.findByPk(id);
        if (!record) return res.status(http.NOT_FOUND).json({ message: "Record not found" });
        res.status(http.OK).json(record);
    } catch (error) {
        console.error("Error fetching unavailable vehicle sale:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};


export const createUnavailableService = async (req: Request, res: Response) => {
    try {
        const {
            call_agent_id,
            unavailable_repair,
            unavailable_paint,
            unavailable_add_on,
            note
        } = req.body;

        if (!call_agent_id || !note) {
            return res.status(http.BAD_REQUEST).json({ message: "call_agent_id and note are required" });
        }

        const service = await UnavailableService.create({
            call_agent_id,
            unavailable_repair,
            unavailable_paint,
            unavailable_add_on,
            note,
        });

        res.status(http.CREATED).json(service);
    } catch (error) {
        console.error("Error creating unavailable service:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

export const getAllUnavailableServices = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await UnavailableService.findAndCountAll({
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        res.status(http.OK).json({
            data: rows,
            meta: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching unavailable services:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

export const getUnavailableServiceById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const record = await UnavailableService.findByPk(id);
        if (!record) return res.status(http.NOT_FOUND).json({ message: "Record not found" });
        res.status(http.OK).json(record);
    } catch (error) {
        console.error("Error fetching unavailable service:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

export const createUnavailableSparePart = async (req: Request, res: Response) => {
    try {
        const {
            call_agent_id,
            vehicle_make,
            vehicle_model,
            part_no,
            year_of_manufacture
        } = req.body;

        if (!call_agent_id || !vehicle_make || !vehicle_model || !part_no || !year_of_manufacture) {
            return res.status(http.BAD_REQUEST).json({ message: "All fields are required" });
        }

        const record = await UnavailableSparePart.create({
            call_agent_id,
            vehicle_make,
            vehicle_model,
            part_no,
            year_of_manufacture,
        });

        res.status(http.CREATED).json(record);
    } catch (error) {
        console.error("Error creating unavailable spare part:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

export const getAllUnavailableSpareParts = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await UnavailableSparePart.findAndCountAll({
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        res.status(http.OK).json({
            data: rows,
            meta: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching unavailable spare parts:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

export const getUnavailableSparePartById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const record = await UnavailableSparePart.findByPk(id);
        if (!record) return res.status(http.NOT_FOUND).json({ message: "Record not found" });
        res.status(http.OK).json(record);
    } catch (error) {
        console.error("Error fetching unavailable spare part:", error);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};