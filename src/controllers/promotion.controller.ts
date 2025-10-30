import {Request, Response} from "express";
import {Op} from "sequelize";
import db from "../models";
import http from "http-status-codes";

const {Promotion} = db;

export const getPromotionsForPart = async (req: Request, res: Response) => {
    try {
        const {sparePartId} = req.params;
        const part = await db.SparePart.findByPk(sparePartId);
        if (!part) return res.status(http.NOT_FOUND).json({message: "Part not found"});

        const now = new Date();
        const promos = await Promotion.findAll({
            where: {
                category: [part.category, "global"],
                [Op.or]: [
                    {starts_at: null, ends_at: null},
                    {starts_at: {[Op.lte]: now}, ends_at: {[Op.gte]: now}}
                ]
            }
        });
        res.status(http.OK).json(promos);
    } catch (err) {
        console.error("getPromotionsForPart", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({message: "Server error"});
    }
};
