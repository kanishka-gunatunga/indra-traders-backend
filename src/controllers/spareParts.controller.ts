import {Request, Response} from "express";
import {Op} from "sequelize";
import db from "../models";
import http from "http-status-codes";

const {SparePart, SparePartStock} = db;

export const listParts = async (req: Request, res: Response) => {
    try {
        const {part_no, name, category} = req.query;
        const where: any = {};

        if (part_no) where.part_no = String(part_no);
        if (name) where.name = {[Op.like]: `%${String(name)}%`};
        if (category) where.category = String(category);

        const parts = await SparePart.findAll({
            where,
            include: [{model: SparePartStock, as: "stocks"}],
            order: [["name", "ASC"]],
            limit: 100,
        });

        res.status(http.OK).json(parts);
    } catch (err) {
        console.error("listParts error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};

export const getStockAvailability = async (req: Request, res: Response) => {
    try {
        const {sparePartId} = req.params;
        const stocks = await SparePartStock.findAll({where: {spare_part_id: sparePartId}});
        res.status(http.OK).json(stocks);
    } catch (err) {
        console.error("getStockAvailability error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};


export const createSparePart = async (req: Request, res: Response) => {
    try {
        const {part_no, name, category, compatibility, description, stocks} = req.body;

        if (!part_no || !name || !category) {
            return res.status(http.BAD_REQUEST).json({message: "Missing required fields: part_no, name, and category are mandatory."});
        }

        const newPart = await SparePart.create({
            part_no: String(part_no).trim(),
            name: String(name).trim(),
            category: String(category).trim(),
            compatibility: compatibility ? String(compatibility).trim() : null,
            description: description ? String(description).trim() : null,
        });


        if (stocks && Array.isArray(stocks) && stocks.length > 0) {
            const stockPromises = stocks.map((stockItem: any) => {
                if (!stockItem.branch || typeof stockItem.stock !== 'number' || typeof stockItem.price !== 'number') {
                    throw new Error(`Invalid stock data for branch ${stockItem.branch}: branch, stock, and price are required.`);
                }
                return SparePartStock.create({
                    spare_part_id: newPart.id,
                    branch: String(stockItem.branch).trim(),
                    stock: Math.max(0, stockItem.stock),
                    price: Math.max(0, stockItem.price),
                });
            });
            await Promise.all(stockPromises);
        }

        const partWithStocks = await SparePart.findByPk(newPart.id, {
            include: [{model: SparePartStock, as: "stocks"}],
        });

        res.status(http.CREATED).json(partWithStocks);
    } catch (err: any) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(http.CONFLICT).json({message: "A spare part with this part_no already exists."});
        }
        if (err.name === 'SequelizeValidationError') {
            return res.status(http.BAD_REQUEST).json({message: "Validation error: " + err.message});
        }
        console.error("createSparePart error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};
