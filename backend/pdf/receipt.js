import express from "express";
import PDFDocument from "pdfkit";
import { supabase } from "../supabaseClient.js";
import path from "path"
import { fileURLToPath } from "url";

const router = express.Router();

router.get("/:payment_id", async (req, res) => {
  try {
    const { payment_id } = req.params;

    const { data: paymentData, error } = await supabase
      .from("Payment")
      .select(`
            id,
            amount,
            currency,
            provider,
            status,
            paid_at,
            Invoice(invoice_number, 
              Session(
                User(first_name,last_name)
              )
            )
        `)
      .eq("id", payment_id)
      .single();

    if (error) return res.status(404).json({ message: "Payment not found"});

    const { Invoice: invoiceData } = paymentData;
    const { User: userData } = invoiceData.Session;

    if (paymentData.status !== "Paid")
      return res.status(400).json({ 
        message: "Receipt can only be generated for completed payments"
      });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=YourRootsPhotography-Reciept.pdf`);

    const doc = new PDFDocument({ margin: 60 });
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const logoPath = path.join(__dirname, "../../public/logo1.png");

    doc.pipe(res);

    /* const clientName =
    `${payment.Invoice?.Session?.User?.first_name || ""} ` +
    `${payment.Invoice?.Session?.User?.last_name || ""}`;

  doc.fontSize(20).text("PBMS Photography").moveDown();
  doc.fontSize(22).text("RECEIPT").moveDown();

  doc.fontSize(12);
  doc.text(`Receipt ID: ${payment.id}`);
  doc.text(
    `Paid Date: ${
      payment.paid_at
        ? new Date(payment.paid_at).toLocaleDateString()
        : "—"
    }`
  );
  doc.text(`Client: ${clientName}`);
  doc.text(`Invoice #: ${payment.Invoice?.invoice_number}`);
  doc.text(`Amount Paid: ${payment.currency} $${payment.amount}`);
  doc.text(`Payment Provider: ${payment.provider}`);
  doc.text(`Status: ${payment.status}`);

  doc.moveDown();
  doc.text("Thank you for your business!");
  doc.end();
  
  } catch (err) {
      console.error("Receipt generation error:", err);
      res.status(500).json({ message: "Server error generating receipt",});
  }
});*/

    //COLORS
    const beige = "#f4f1eb";
    const sage = "#7f8f7a";
    const dark = "#4a4a4a";
    const softLine = "#d8d2cb";

    //BACKGROUND
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(beige);
    doc.image(logoPath, 80, 60, { width: 100 });
    let y = 200;

    //PAID STAMP
    doc.circle(500, 120, 85)
      .fill(sage);

    doc
      .fillColor("white")
      .fontSize(28)
      .font("Times-BoldItalic")
      .text("PAID", 462, 108);

    //TITLE
    doc
      .fillColor(sage)
      .font("Times-Roman")
      .fontSize(30)
      .text("RECEIPT", 80, y);

    //INFO
    doc
      .fillColor(dark)
      .fontSize(16)
      .text(`No. ${paymentData.id.slice(0, 8)}`, 80, y + 45);


    doc
      .text(paymentData.paid_at ? new Date(paymentData.paid_at).toLocaleDateString() : "-", 80, y + 70);



    //DIVIDER
    doc.moveTo(80, 320).lineTo(520, 320).strokeColor(softLine).stroke();

    //CUSTOMER
    const clientName =
      `${userData?.first_name || ""} ` +
      `${userData?.last_name || ""}`;

    doc
      .fillColor(dark)
      .fontSize(16)
      .text("RECEIPT TO:", 80, 350);


    doc
      .fontSize(14)
      .text(clientName, 80, 380);


    //TABLE
    doc.rect(80, 460, 440, 140).stroke(softLine);

    doc
      .fontSize(16)
      .fillColor(dark)
      .text("DESCRIPTION", 100, 480)
      .text("TOTAL", 430, 480);

    doc.moveTo(80, 510).lineTo(520, 510).stroke(softLine);

    doc
      .fontSize(12)
      .text("Photography Session Payment", 100, 540);

    doc
      .font("Times-Bold")
      .text(
        `${paymentData.currency} $${(paymentData.amount).toFixed(2)}`, 340, 540,
        { align: "right", width: 160 });

    //TOTAL SECTION
    doc.moveDown(4);
    //doc.moveTo(80, doc.page.width).lineTo(520, doc.page.width).stroke(softLine);

    doc
      .fontSize(14)
      .font("Times-Bold")
      .text("TOTAL AMOUNT", 80, 590, { align: "right", width: 400 });

    doc
      .font("Times-Bold")
      .fontSize(18)
      .text(
        `${paymentData.currency} $${(paymentData.amount).toFixed(2)}`, 80, 615,
        { align: "right", width: 440 });

    //BOTTOM SECTION
    const footerY = doc.page.height - 160;
    //doc.moveTo(160, footerY - 20).lineTo(440, footerY - 20).stroke(softLine);

    doc
      .font("Times-Roman")
      .fontSize(14)
      .fillColor("#5a3e36")
      .text("YOUR ROOTS PHOTOGRAPHY", 80, footerY, {
        align: "center", width: doc.page.width - 160,
      });

    doc
      .fontSize(12)
      .fillColor(dark)
      .text("Sacramento, California", 80, footerY + 25, { align: "center", width: doc.page.width - 160 });

    doc
      .text("support@yourrootsphotography.com", 80, footerY + 45, { align: "center", width: doc.page.width - 160 });

    doc
      .fontSize(12)
      .fillColor("#5a3e36")
      .text(
        "Thank you for trusting Your Roots Photography.", 80, footerY + 68,
        { align: "center", width: doc.page.width - 160 });

    doc.end();

  } catch (err) {
    console.error("Receipt generation error:", err);
    res.status(500).json({
      message: "Server error generating receipt",
    });
  }
});

export default router;