import express from "express";
import PDFDocument from "pdfkit";
import { supabase } from "../supabaseClient.js";
import { fileURLToPath } from "url";
import path from "path"

const router = express.Router();

// Invoice for Sessions
const TAX_RATE = 0.0725; // 7.25% tax rate, can be adjusted as needed

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

    const now = new Date();
    const issueDate = `${now.getFullYear().toString()}` + "-" +
                      `${(now.getMonth() + 1).toString().padStart(2, '0')}` + "-" +
                      `${now.getDate().toString().padStart(2, '0')}`;

    const { data: invoiceData, error: insertError } = await supabase
      .from("Invoice")
      .insert({
        session_id: session_id,
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

    // TODO: select all entries where created_at_year is now.getFullYear()
    // if data == null set to 1
    // otherwise find max serial_number and add 1
    // append this to invoice number: `INV-${now.getFullYear()}-`
    // use rpc to set/get this value

    // TODO: CHANGE THIS TO BE AN AUTO-INCREMENTING THING
    const invoiceNumber = `INV-${now.getFullYear()}-${now.getTime()}`;

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("Invoice")
      .update({ invoice_number: invoiceNumber })
      .eq("id", invoiceData.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json(updatedInvoice);

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
          SessionType(name, base_price),
          User(first_name, last_name, email, phone)
        )
      `)
      .eq("id", invoice_id)
      .single();

    // If no invoice is found, it errors
    if (error) return res.status(404).json({ message: "Invoice not found" });

    const { User: userData, SessionType: sessionTypeData } = invoiceData.Session;
    const createdDate = new Date(invoiceData.created_at).toLocaleDateString(
      "en-US",
      {
        year: "numeric", month: "long", day: "numeric",
  });

    // PDF Creation


    const doc = new PDFDocument({ margin: 50 });
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const logoPath = path.join(__dirname, "../../public/logo1.png");

    const beige = "#f4f1eb";
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(beige);
    doc.image(logoPath, 30, 50, { width: 100 });
    

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=PBMSInvoice.pdf`
    );

    doc.pipe(res);

    //PDF Design layout
    doc
      .fontSize(20)
      //.text("Your Roots Photography", { align: "left" }, 50, 90)
      .fontSize(10)
      .fillColor("#555")
      //.text("123 Business St.", 50, 160)
      .text("Your Roots Photography", 50, 160)
      .text("your.rootsphotography@gmail.com")
      .text("(707) 514 6456")
      .moveDown();

    doc.moveTo(50, 230).lineTo(550, 230).stroke();

    // TITLE
    doc
      .fontSize(22)
      .fillColor("black")
      .text("INVOICE", 50, 250);

    const dueDate = new Date(invoiceData.due_date).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );
    
    //Invoice Information
    const labelX = 320;
    const valueX = 330;

    doc.fontSize(9);
    doc.fillColor("gray");

    doc.text("Invoice Number:", labelX, 80, { width: 120, align: "right" });
    doc.text(invoiceData.invoice_number, valueX + 120, 80);

    doc.text("Invoice Date:", labelX, 90, { width: 120, align: "right" });
    doc.text(createdDate, valueX + 120, 90);

    doc.fontSize(11);
    doc.fillColor("black");

    doc.text("Payment Due:", labelX, 100, { width: 120, align: "right" });
    doc.text(dueDate, valueX + 120, 100);

    // CLIENT INFO
    doc.fontSize(11);
    //doc.text(`Invoice Number: ${invoiceData.invoice_number}`, 50, 280);
    //doc.text(`Invoice Date: ${createdDate}`, 50, 295);
    doc.fillColor("gray");
    doc.text("To:", 50, 290);
    doc.fillColor("black");
    doc.text(`${userData.first_name} ${userData.last_name}`, 50, 310);
    doc.text(`${userData.email}`, 50, 325);
    doc.text(`${userData.phone}`, 50, 340);

    // TABLE HEADER
    const tableTop = 380;

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

const serviceName = invoiceData.Session.SessionType.name;
const price = invoiceData.Session.SessionType.base_price;
const quantity = 1;
const total = price * quantity;

doc
  .text(serviceName, 50, posY)
  .text(quantity, 300, posY, { width: 50, align: "right" })
  .text(`$${price.toFixed(2)}`, 350, posY, { width: 100, align: "right" })
  .text(`$${total.toFixed(2)}`, 450, posY, {
    width: 100,
    align: "right",
  });

posY += 25;

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
      .text("Thank you for choosing Your Roots Photography!", 50, 680, { width: 500, align: "center" });

    doc.end();


  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;