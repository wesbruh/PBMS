import express from "express";
import PDFDocument from "pdfkit";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// Invoice for Sessions
const TAX_RATE = 0.05; // 5% tax rate, can be adjusted as needed

router.post("/generate/:session_id", async (req, res) => {
  try {
    const { session_id } = req.params;
    const { remaining, due_date } = req.body;

    const { data: sessionData, error: sessionError } = await supabase
      .from("Session")
      .select("SessionType(name, description, base_price)")
      .eq("id", session_id)
      .single();

    if (sessionError) return res.status(404).json({ message: "Session not found" });

    const invoiceNumber = `INV-${Date.now()}`;
    const now = new Date();
    const issueDate = `${now.getFullYear().toString()}` + "-" +
                      `${(now.getMonth() + 1).toString().padStart(2, '0')}` + "-" +
                      `${now.getDate().toString().padStart(2, '0')}`;

    const { data: invoiceData, error: insertError } = await supabase
      .from("Invoice")
      .insert({
        session_id: session_id,
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: due_date,
        remaining: remaining,
        status: "Unpaid",
        items: [
          {
            description: sessionData.SessionType.name,
            quantity: 1,
            price: sessionData.SessionType.base_price
          }
        ],
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.json(invoiceData);

  } catch (err) {
    console.error("Invoice generation error:", err);
    res.status(500).json({ message: "Failed to create invoice" });
  }
});

router.get("/:invoice_id/pdf", async (req, res) => {
  try {
    const { invoice_id } = req.params;

    // Fetch invoice from Supabase 
    const { data: invoiceData, error } = await supabase
      .from("Invoice")
      .select(`
        id, invoice_number, issue_date, due_date, remaining, created_at, items,
        Session(
          SessionType(base_price),
          User(first_name, last_name, email)
        )
      `)
      .eq("id", invoice_id)
      .single();

    // If no invoice is found, it errors
    if (error) return res.status(404).json({ message: "Invoice not found" });

    const { User: userData, SessionType: sessionTypeData } = invoiceData.Session;

    // PDF Creation
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
    doc.text(`Invoice Number: ${invoiceData.invoice_number}`, 50, 210);
    doc.text(`Invoice Date: ${invoiceData.created_at}`, 50, 225);
    doc.text(`Client: ${userData.first_name} ${userData.last_name}`, 50, 240);
    doc.text(`Email: ${userData.email}`, 50, 255);

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

    if (Array.isArray(invoiceData.items)) {
      invoiceData.items.forEach((item) => {
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
      .text(`Subtotal: $${(sessionTypeData.base_price).toFixed(2)}`, 400, posY + 20, {
        align: "right",
      })
      .text(`Tax: $${(sessionTypeData.base_price * TAX_RATE).toFixed(2)}`, 400, posY + 40, { align: "right" })
      .text(`Total: $${(sessionTypeData.base_price + sessionTypeData.base_price * TAX_RATE).toFixed(2)}`, 400, posY + 60, {
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