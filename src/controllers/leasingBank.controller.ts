import { Request, Response } from "express";
import http from 'http-status-codes';
import db from "../models";

const { LeasingBank } = db;

export const createBank = async (req: Request, res: Response) => {
    try {
        const { bank_name, interest_rate, available_months, is_active } = req.body;

        if (!bank_name || !interest_rate) {
            return res.status(http.BAD_REQUEST).json({ message: "Bank name and Interest rate are required" });
        }

        const existingBank = await LeasingBank.findOne({ where: { bank_name } });
        if (existingBank) {
            return res.status(http.CONFLICT).json({ message: "Bank already exists" });
        }

        const bank = await LeasingBank.create({
            bank_name,
            interest_rate,
            available_months: available_months || [12, 24, 36, 48, 60],
            is_active: is_active !== undefined ? is_active : true
        });

        res.status(http.CREATED).json({ message: "Bank added successfully", bank });
    } catch (error: any) {
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error creating bank", error: error.message });
    }
};

export const getActiveBanks = async (req: Request, res: Response) => {
    try {
        const banks = await LeasingBank.findAll({
            where: { is_active: true },
            attributes: ['id', 'bank_name', 'interest_rate', 'available_months'],
            order: [['bank_name', 'ASC']]
        });
        res.json(banks);
    } catch (error: any) {
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error fetching banks", error: error.message });
    }
};


export const getAllBanks = async (req: Request, res: Response) => {
    try {
        const banks = await LeasingBank.findAll({
            order: [['bank_name', 'ASC']]
        });
        res.json(banks);
    } catch (error: any) {
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error fetching banks", error: error.message });
    }
};


export const updateBank = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { bank_name, interest_rate, available_months, is_active } = req.body;

        const bank = await LeasingBank.findByPk(id);
        if (!bank) {
            return res.status(http.NOT_FOUND).json({ message: "Bank not found" });
        }

        await bank.update({
            bank_name,
            interest_rate,
            available_months,
            is_active
        });

        res.json({ message: "Bank details updated successfully", bank });
    } catch (error: any) {
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error updating bank", error: error.message });
    }
};


export const deleteBank = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const bank = await LeasingBank.findByPk(id);

        if (!bank) {
            return res.status(http.NOT_FOUND).json({ message: "Bank not found" });
        }

        await bank.destroy();
        res.json({ message: "Bank deleted successfully" });
    } catch (error: any) {
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Error deleting bank", error: error.message });
    }
};