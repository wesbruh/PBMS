import express from "express";
import PDFDocument from "pdfkit";
import path from "path"
import { fileURLToPath } from "url";

export default function receiptRoutes(supabaseClient) {
  const router = express.Router();

  router.get("/:invoice_id", async (req, res) => {
    const { invoice_id } = req.params;

    try {
      const { data: paymentData, error } = await supabaseClient
        .from("Payment")
        .select(`
            id,
            amount,
            currency,
            provider,
            status,
            paid_at,
            type,
            Invoice(invoice_number, 
              Session(
                SessionType(name, base_price),
                User(first_name,last_name, email, phone)
              )
            )
        `)
        .eq("invoice_id", invoice_id)
        .eq("status", "Paid")
        .single();

      if (error) return res.status(404).json({ message: "Payment not found" });

      const { Invoice: invoiceData } = paymentData;
      const { User: userData, SessionType: sessionTypeData } = invoiceData.Session;
      const sessionType = sessionTypeData?.name || "Photography Session";
      const sessionBasePrice = sessionTypeData?.base_price || paymentData.amount;

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

      //COLORS
      const beige = "#f4f1eb";
      const sage = "#7f8f7a";
      const dark = "#4a4a4a";
      const softLine = "#d8d2cb";
      const crimson = "#9B3A3A";
      const navy = "#2C3E6B";
      const darkGreen = "#2D4A35";
      const gray = "#555";

      //BACKGROUND
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(beige);
      doc.image(logoPath, 30, 50, { width: 100 });
      let y = 200;

      doc
        .fontSize(20)
        //.text("Your Roots Photography", { align: "left" }, 50, 90)
        .fontSize(10)
        .font("Times-Roman")
        .fillColor(gray)
        //.text("123 Business St.", 50, 160)
        .text("Your Roots Photography", 50, 160)
        .text("your.rootsphotography@gmail.com")
        .text("(707) 514 6456")
        .moveDown();

      doc.moveTo(50, 230).lineTo(550, 230).stroke();

      //PAID STAMP
      doc.circle(503, 123, 72)
        .fill(dark);
      doc.circle(500, 120, 70)
        .fill(sage);

      doc
        .fillColor("black")
        .fontSize(28)
        .font("Times-BoldItalic")
        .text("PAID", 464, 108);

      doc
        .fillColor("white")
        .fontSize(28)
        .font("Times-BoldItalic")
        .text("PAID", 462, 108);

      //TITLE
      doc
        .fillColor("black")
        .font("Times-Roman")
        .fontSize(30)
        .text("RECEIPT", 240, 200);

      //INFO
      doc
        .fillColor(gray)
        .fontSize(12)
        .text(`No. ${paymentData.id.slice(0, 8)}`, 80, y + 45)
        .text(`Payment type: ${paymentData.type || "-"}`, 80, y + 57)
        .text(`Payment method: ${paymentData.provider || "-"}`, 80, y + 71);


      doc
        .text(paymentData.paid_at ? new Date(paymentData.paid_at).toLocaleDateString() : "-", 80, y + 85);



      //DIVIDER
      doc.moveTo(80, 320).lineTo(520, 320).strokeColor(softLine).stroke();

      //CUSTOMER
      const clientName =
        `${userData?.first_name || ""} ` +
        `${userData?.last_name || ""}`;

      doc
        .fillColor(gray)
        .fontSize(11)
        .text("RECEIPT TO:", 80, 325);


      doc
        .fillColor("black")
        .fontSize(12)
        .text(`${userData.first_name} ${userData.last_name}`, 80, 345)
        .text(`${userData.email}`, 80, 357)
        .text(`${userData.phone}`, 80, 371);

      const TAX_RATE = 0.0725
      const subtotal = sessionBasePrice;
      const tax = subtotal * TAX_RATE;
      const total = subtotal + tax;


      //TABLE
      const tableTop = 400;
      const tableLeft = 80;
      const tableWidth = 440;
      const colQty = tableLeft + 10;
      const colDesc = tableLeft + 60;
      const colSubtotal = tableLeft + 260;
      const colTotal = tableLeft + 360;

      //Header background
      doc.rect(tableLeft, tableTop, tableWidth, 30).fill(softLine);

      //Header labels
      doc
        .fontSize(11)
        .font("Times-Bold")
        .fillColor(dark)
        .text("QTY", colQty, tableTop + 10)
        .text("DESCRIPTION", colDesc, tableTop + 10)
        .text("PRICE", colSubtotal, tableTop + 10)
        .text("TOTAL", colTotal, tableTop + 10);

      //Row divider
      doc.moveTo(tableLeft, tableTop + 30).lineTo(tableLeft + tableWidth, tableTop + 30).strokeColor(softLine).stroke();

      //Row content
      doc
        .fontSize(11)
        .font("Times-Roman")
        .fillColor(dark)
        .text("1", colQty, tableTop + 45)
        .text(sessionType, colDesc, tableTop + 45)
        .text(`$${subtotal.toFixed(2)}`, colSubtotal, tableTop + 45)
        .text(`$${total.toFixed(2)}`, colTotal, tableTop + 45)


      //Outer box
      doc.rect(tableLeft, tableTop, tableWidth, 80).stroke(softLine);

      //TOTALS
      const totalsY = tableTop + 100;

      doc.moveTo(tableLeft + 260, totalsY).lineTo(tableLeft + tableWidth, totalsY).strokeColor(softLine).stroke();

      doc
        .fontSize(11)
        .font("Times-Roman")
        .fillColor(dark)
        .text("Subtotal", colSubtotal, totalsY + 10)
        .text(`$${subtotal.toFixed(2)}`, colTotal, totalsY + 10);

      //doc.moveTo(tableLeft + 260, totalsY + 28).lineTo(tableLeft + tableWidth, totalsY + 28).strokeColor(softLine).stroke();

      doc
        .text("Tax", tableLeft + 260, totalsY + 20)
        .text(`$${tax.toFixed(2)}`, tableLeft + 360, totalsY + 20);

      doc
        .fontSize(11)
        .font("Times-Bold")
        .fillColor(dark)
        .text("TOTAL", colSubtotal, totalsY + 30)
        .text(`$${total.toFixed(2)}`, colTotal, totalsY + 30);

      //BOTTOM SECTION
      const footerY = doc.page.height - 120;
      //doc.moveTo(160, footerY - 20).lineTo(440, footerY - 20).stroke(softLine);

      doc
        .font("Times-Roman")
        .fontSize(10)
        .fillColor("#5a3e36")
        .text("YOUR ROOTS PHOTOGRAPHY", 80, footerY, {
          align: "center", width: doc.page.width - 160,
        });

      doc
        .fontSize(9)
        .fillColor(dark)
        .text("Northern California", 80, footerY + 18, { align: "center", width: doc.page.width - 160 });

      doc
        .text("support@yourrootsphotography.com", 80, footerY + 32, { align: "center", width: doc.page.width - 160 });

      doc
        .fontSize(9)
        .fillColor("#5a3e36")
        .text(
          "Thank you for trusting Your Roots Photography.", 80, footerY + 48,
          { align: "center", width: doc.page.width - 160 });

      doc.end();

    } catch (err) {
      console.error("Receipt generation error:", err);
      res.status(500).json({
        message: "Server error generating receipt",
      });
    }
  });

  return router;
}