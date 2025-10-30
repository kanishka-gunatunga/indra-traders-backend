import { Request, Response } from "express";
import db from "../models";
import http from "http-status-codes";

const { SpareInvoice, SpareInvoiceItem } = db;

export const lastPurchases = async (req: Request, res: Response) => {
    try {
        const { limit = 10 } = req.query;
        const invoices = await SpareInvoice.findAll({
            include: [{ model: SpareInvoiceItem, as: "items" }],
            order: [["date", "DESC"]],
            limit: Number(limit),
        });
        res.status(http.OK).json(invoices);
    } catch (err) {
        console.error("lastPurchases error:", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};

export const invoiceDetails = async (req: Request, res: Response) => {
    try {
        const { invoiceNo } = req.params;
        const invoice = await SpareInvoice.findOne({ where: { invoice_no: invoiceNo }, include: [{ model: SpareInvoiceItem, as: "items" }] });
        if (!invoice) return res.status(http.NOT_FOUND).json({ message: "Invoice not found" });
        res.status(http.OK).json(invoice);
    } catch (err) {
        console.error("invoiceDetails", err);
        res.status(http.INTERNAL_SERVER_ERROR).json({ message: "Server error" });
    }
};
