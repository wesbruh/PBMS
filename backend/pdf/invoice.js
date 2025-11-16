import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createInvoicePDF } from "../utils/createInvoicePDF.js";
import { supabase } from "./supabaseClient.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/:invoiceId/download", async (req, res) => {
    try {
        const invoiceId = req.params.invoiceId;

        const { data: invoice, error } = await supabase
            .from("invoices")
            .select("*")
            .eq("id", invoiceId)
            .single();

        if (error || !invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        const filePath = path.join(__dirname, `invoice-${invoiceId}.pdf`);

        createInvoicePDF(invoice, filePath);

        setTimeout(() => {
            if (!fs.existsSync(filePath)) {
                return res.status(500).json({ message: "Failed to generate PDF" });
            }

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=invoice-${invoiceId}.pdf`,
            });

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);

            stream.on("close", () => {
                fs.unlinkSync(filePath);
            });
        }, 500);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
