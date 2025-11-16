import PDFDocument from "pdfkit";
import fs from "fs";

export function createInvoicePDF(invoiceData, path) {
    const doc = new PDFDocument({ margin: 50 });

    doc.pipe(fs.createWriteStream(path));

    // HEADER
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
    doc.text(`Invoice Number: ${invoiceData.id}`, 50, 210);
    doc.text(`Invoice Date: ${invoiceData.created_at}`, 50, 225);
    doc.text(`Client: ${invoiceData.client_name}`, 50, 240);
    doc.text(`Email: ${invoiceData.client_email}`, 50, 255);

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

    // TOTALS
    doc
        .font("Helvetica-Bold")
        .text(`Subtotal: $${invoiceData.subtotal}`, 400, posY + 20, {
            align: "right",
        })
        .text(`Tax: $${invoiceData.tax}`, 400, posY + 40, { align: "right" })
        .text(`Total: $${invoiceData.total}`, 400, posY + 60, {
            align: "right",
        });

    // FOOTER
    doc
        .fontSize(10)
        .fillColor("#555")
        .text("Thank you for choosing PBMS!", 50, 720, { align: "center" });

    doc.end();
}
