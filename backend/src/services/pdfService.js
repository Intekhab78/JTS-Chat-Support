import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Generate Purchase Order PDF (Returns Buffer)
 */
export async function generatePurchaseOrderPDF(order, supplier, website) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const result = Buffer.concat(buffers);
        resolve(result);
      });

      drawHeader(doc, website?.websiteName || "PURCHASE ORDER", "PURCHASE ORDER", order.poNumber, order.createdAt, website?.domain);
      drawAddresses(doc, { name: website?.websiteName, sub: "Internal Procurement" }, { name: supplier?.companyName, person: supplier?.contactPerson, email: supplier?.email, phone: supplier?.phone, address: supplier?.address });
      
      const tableTop = 260;
      doc.font("Helvetica-Bold");
      generateTableRow(doc, tableTop, "Item Description", "Qty", "Unit Price", "Total");
      generateHr(doc, tableTop + 20);
      doc.font("Helvetica");

      let i;
      for (i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const position = tableTop + (i + 1) * 30;
        generateTableRow(
          doc,
          position,
          item.name || item.description || `Item ${i}`,
          item.quantity.toString(),
          formatCurrency(item.unitPrice || item.price),
          formatCurrency(item.quantity * (item.unitPrice || item.price))
        );
        generateHr(doc, position + 20);
      }

      const subtotalPosition = tableTop + (i + 1) * 30;
      doc.font("Helvetica-Bold");
      generateTableRow(doc, subtotalPosition, "", "", "GRAND TOTAL", formatCurrency(order.total));

      drawFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Quotation PDF (Saves to file and returns path)
 */
export async function generateQuotationPDF(quotation) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `quote_${quotation.quotationId}_${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const stream = fs.createWriteStream(filePath);
      stream.on("finish", () => {
        resolve({
          path: `/uploads/${fileName}`,
          filePath
        });
      });
      stream.on("error", reject);
      doc.pipe(stream);

      drawHeader(doc, "QUOTATION", "QUOTATION", quotation.quotationId, quotation.createdAt);
      // We don't have full customer/website objects here usually, they might be populated or just IDs
      // For now, simpler addresses
      drawAddresses(doc, { name: "Our Company" }, { name: "Valued Customer" });

      const tableTop = 260;
      doc.font("Helvetica-Bold");
      generateTableRow(doc, tableTop, "Item Description", "Qty", "Price", "Total");
      generateHr(doc, tableTop + 20);
      doc.font("Helvetica");

      let i;
      for (i = 0; i < quotation.items.length; i++) {
        const item = quotation.items[i];
        const position = tableTop + (i + 1) * 30;
        generateTableRow(
          doc,
          position,
          item.description,
          item.quantity.toString(),
          formatCurrency(item.price),
          formatCurrency(item.total)
        );
        generateHr(doc, position + 20);
      }

      const totalPosition = tableTop + (i + 1) * 30;
      doc.font("Helvetica-Bold");
      generateTableRow(doc, totalPosition, "", "", "TOTAL", formatCurrency(quotation.total));

      drawFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Invoice PDF (Saves to file and returns path)
 */
export async function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `invoice_${invoice.invoiceId}_${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const stream = fs.createWriteStream(filePath);
      stream.on("finish", () => {
        resolve({
          path: `/uploads/${fileName}`,
          filePath
        });
      });
      stream.on("error", reject);
      doc.pipe(stream);

      drawHeader(doc, invoice.companyName || "INVOICE", "INVOICE", invoice.invoiceId, invoice.issuedAt || invoice.createdAt);
      drawAddresses(doc, { name: invoice.companyName || "Our Company" }, { name: "Valued Customer" });

      const tableTop = 260;
      doc.font("Helvetica-Bold");
      generateTableRow(doc, tableTop, "Item Description", "Qty", "Price", "Total");
      generateHr(doc, tableTop + 20);
      doc.font("Helvetica");

      let i;
      for (i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const position = tableTop + (i + 1) * 30;
        generateTableRow(
          doc,
          position,
          item.description,
          item.quantity.toString(),
          formatCurrency(item.price),
          formatCurrency(item.total)
        );
        generateHr(doc, position + 20);
      }

      const totalPosition = tableTop + (i + 1) * 30;
      doc.font("Helvetica-Bold");
      generateTableRow(doc, totalPosition, "", "", "TOTAL PAID", formatCurrency(invoice.total));

      drawFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// --- HELPERS ---

function drawHeader(doc, titleLeft, titleRight, number, date, subLeft) {
  doc.fillColor("#444444")
    .fontSize(20)
    .text(titleLeft.toUpperCase(), 50, 50, { align: "left" })
    .fontSize(10)
    .text(subLeft || "", 50, 75, { align: "left" })
    .fontSize(25)
    .fillColor("#6366F1")
    .text(titleRight, 50, 50, { align: "right" })
    .fontSize(10)
    .fillColor("#444444")
    .text(`No: ${number}`, 50, 80, { align: "right" })
    .text(`Date: ${new Date(date).toLocaleDateString()}`, 50, 95, { align: "right" })
    .moveDown();

  doc.moveTo(50, 115).lineTo(550, 115).stroke("#EEEEEE");
}

function drawAddresses(doc, from, to) {
  const topOffset = 140;
  doc.fontSize(10)
    .fillColor("#999999")
    .text("FROM:", 50, topOffset)
    .fillColor("#000000")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(from.name || "Our Company", 50, topOffset + 15)
    .font("Helvetica")
    .fontSize(10)
    .text(from.sub || "", 50, topOffset + 30);

  doc.fontSize(10)
    .fillColor("#999999")
    .text("TO:", 300, topOffset)
    .fillColor("#000000")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(to.name || "Customer", 300, topOffset + 15)
    .font("Helvetica")
    .fontSize(10)
    .text(to.person || "", 300, topOffset + 30)
    .text(to.email || "", 300, topOffset + 45)
    .text(to.phone || "", 300, topOffset + 60)
    .text(to.address || "", 300, topOffset + 75);

  doc.moveDown(4);
}

function generateTableRow(doc, y, item, qty, unitPrice, total) {
  doc.fontSize(10)
    .text(item, 50, y, { width: 250 })
    .text(qty, 300, y, { width: 50, align: "right" })
    .text(unitPrice, 350, y, { width: 100, align: "right" })
    .text(total, 450, y, { width: 100, align: "right" });
}

function generateHr(doc, y) {
  doc.strokeColor("#F8FAFC")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}

function drawFooter(doc) {
  const footerTop = 750;
  doc.moveTo(50, footerTop).lineTo(550, footerTop).stroke("#EEEEEE");
  doc.fontSize(8)
    .fillColor("#AAAAAA")
    .text("This is a computer-generated document. No signature is required.", 50, footerTop + 15, { align: "center" });
}

function formatCurrency(val) {
  return "INR " + Number(val || 0).toLocaleString();
}
