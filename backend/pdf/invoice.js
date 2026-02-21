import express from "express";
import PDFDocument from "pdfkit";
import { supabase } from "../supabaseClient.js";


const router = express.Router();

router.get("/:invoiceId/pdf", async (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;

    //Fetch invoice from Supabase 
    const { data: invoice, error } = await supabase
      .from("Invoice")
      .select("*")
      .eq("id", invoiceId)
      .single();

    //If no invoice is found, it errors
    if (!invoice || error) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    //PDF Creation
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=PBMSInvoice.pdf`
    );

    doc.pipe(res);

    /*OLD Invoice Content
    
    doc.fontSize(22).text("INVOICE", { align: "left" }).moveDown();

    doc.fontSize(12).text(`Invoice Number: ${invoice.id}`);
    doc.text(`Invoice Date: ${invoice.created_at}`);
    doc.text(`Client Name: ${invoice.client_name}`);
    doc.text(`Client Email: ${invoice.client_email}`);
    doc.moveDown();

    doc.fontSize(14).text("Items:", { underline: true });
    doc.moveDown(0.5);

    if (Array.isArray(invoice.items)) {
      invoice.items.forEach((item) => {
        doc.fontSize(12).text(
          `${item.description} — Qty: ${item.quantity} — $${item.price}`
        );
      });
    } else {
      doc.text("No items found.");
    }

    doc.moveDown();
    doc.fontSize(14).text(`Subtotal: $${invoice.subtotal}`);
    doc.text(`Tax: $${invoice.tax}`);
    doc.text(`Total: $${invoice.total}`);

    doc.end();*/

    //PDF Design layout
     doc
        .fontSize(20)
        .text("PBMS Photography", { align: "left" })
        .fontSize(10)
        .fillColor("#555")
        .text("123 Business St.")
        .text("Sacramento, CA 95819")
        .text("Email: support@pbms.com")
        .moveDown();

    doc.moveTo(50, 150).lineTo(550, 150).stroke();

    // TITLE
    doc
        .fontSize(22)
        .fillColor("black")
        .text("INVOICE", 50, 170);

    // CLIENT INFO
    doc.fontSize(11);
    doc.text(`Invoice Number: ${invoice.id}`, 50, 210);
    doc.text(`Invoice Date: ${invoice.created_at}`, 50, 225);
    doc.text(`Client: ${invoice.client_name}`, 50, 240);
    doc.text(`Email: ${invoice.client_email}`, 50, 255);

    // TABLE HEADER
    const tableTop = 300;

    doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Service", 50, tableTop)
        .text("Qty", 300, tableTop, { width: 50, align: "right" })
        .text("Price", 350, tableTop, { width: 100, align: "right" })
        .text("Total", 450, tableTop, { width: 100, align: "right" });

    doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();

    // ITEMS
    doc.font("Helvetica").fontSize(11);
    let posY = tableTop + 40;

    if(Array.isArray(invoice.items)){
    invoice.items.forEach((item) => {
        doc
            .text(item.description, 50, posY)
            .text(item.quantity, 300, posY, { width: 50, align: "right" })
            .text(`$${item.price}`, 350, posY, { width: 100, align: "right" })
            .text(`$${item.quantity * item.price}`, 450, posY, {
                width: 100,
                align: "right",
            });

        posY += 25;
    });
} else { 
    doc.text("No items found.", 50, posY);
    posY += 20;
}
    // TOTALS
    doc
        .font("Helvetica-Bold")
        .text(`Subtotal: $${invoice.subtotal}`, 400, posY + 20, {
            align: "right",
        })
        .text(`Tax: $${invoice.tax}`, 400, posY + 40, { align: "right" })
        .text(`Total: $${invoice.total}`, 400, posY + 60, {
            align: "right",
        });

    // FOOTER
    doc
        .fontSize(10)
        .fillColor("#555")
        .text("Thank you for choosing Your Roots Photography!", 50, 720, { align: "center" });

    doc.end();
    

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;