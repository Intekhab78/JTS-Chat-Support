import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Customer } from "../models/Customer.js";
import { Website } from "../models/Website.js";

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

      const tableTop = 240;
      doc.save();
      doc.roundedRect(50, tableTop, 495, 22, 4).fillColor("#4F46E5").fill();
      doc.restore();

      doc.fillColor("#FFFFFF").font("Helvetica-Bold");
      generateTableRow(doc, tableTop + 6, "Item Description", "Qty", "Unit Price", "Total Amount");
      doc.font("Helvetica");

      let i;
      for (i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const position = tableTop + 30 + (i * 26);

        if (i % 2 === 1) {
          doc.save();
          doc.roundedRect(50, position - 4, 495, 20, 2).fillColor("#F8FAFC").fill();
          doc.restore();
        }

        doc.fillColor("#334155");
        generateTableRow(
          doc,
          position,
          item.name || item.description || `Item ${i}`,
          item.quantity.toString(),
          formatCurrency(item.unitPrice || item.price, website?.currency || "AED"),
          formatCurrency(item.quantity * (item.unitPrice || item.price), website?.currency || "AED")
        );
        doc.moveTo(50, position + 16).lineTo(545, position + 16).strokeColor("#F1F5F9").lineWidth(1).stroke();
      }

      const totalPosition = tableTop + 35 + (i * 26);
      doc.save();
      doc.roundedRect(320, totalPosition, 225, 30, 6).fillColor("#F1F5F9").fill();
      doc.restore();

      doc.font("Helvetica-Bold").fillColor("#1E293B").fontSize(9);
      doc.text("GRAND TOTAL", 330, totalPosition + 10, { width: 120 });
      doc.fillColor("#4F46E5").fontSize(11);
      doc.text(formatCurrency(order.total, website?.currency || "AED"), 440, totalPosition + 9, { width: 100, align: "right" });

      drawFooter(doc, totalPosition + 40);
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
  return new Promise(async (resolve, reject) => {
    try {
      // Find customer details
      let customerDetails = { name: "Valued Customer" };
      try {
        const cust = await Customer.findById(quotation.customerId);
        if (cust) {
          customerDetails = {
            name: cust.name || "Valued Customer",
            person: cust.companyName || "",
            email: cust.email || "",
            phone: cust.phone || "",
            address: cust.requirement || ""
          };
        }
      } catch (err) {
        console.error("Failed to load customer details for Quote PDF:", err);
      }

      // Find website details
      let websiteDetails = { name: "JTS Support", domain: "chat.jtsmiddleeast.com" };
      try {
        const web = await Website.findById(quotation.websiteId);
        if (web) {
          websiteDetails = {
            name: web.websiteName || "JTS Support",
            domain: web.domain || "chat.jtsmiddleeast.com"
          };
        }
      } catch (err) {
        console.error("Failed to load website details for Quote PDF:", err);
      }

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

      drawHeader(doc, websiteDetails.name, "QUOTATION", quotation.quotationId, quotation.createdAt, websiteDetails.domain, { invoiceNumber: quotation.invoiceNumber });
      drawAddresses(doc, { name: websiteDetails.name, sub: "Sales Quotation Dept" }, customerDetails);

      const tableTop = 240;
      doc.save();
      doc.roundedRect(50, tableTop, 495, 22, 4).fillColor("#4F46E5").fill();
      doc.restore();

      doc.fillColor("#FFFFFF").font("Helvetica-Bold");
      generateTableRow(doc, tableTop + 6, "Item Description", "Qty", "Price", "Total");
      doc.font("Helvetica");

      let i;
      for (i = 0; i < quotation.items.length; i++) {
        const item = quotation.items[i];
        const position = tableTop + 30 + (i * 26);

        if (i % 2 === 1) {
          doc.save();
          doc.roundedRect(50, position - 4, 495, 20, 2).fillColor("#F8FAFC").fill();
          doc.restore();
        }

        doc.fillColor("#334155");
        generateTableRow(
          doc,
          position,
          item.description,
          item.quantity.toString(),
          formatCurrency(item.price, quotation.currency),
          formatCurrency(item.total, quotation.currency)
        );
        doc.moveTo(50, position + 16).lineTo(545, position + 16).strokeColor("#F1F5F9").lineWidth(1).stroke();
      }

      const totalPosition = tableTop + 35 + (i * 26);
      doc.save();
      doc.roundedRect(320, totalPosition, 225, 30, 6).fillColor("#F1F5F9").fill();
      doc.restore();

      doc.font("Helvetica-Bold").fillColor("#1E293B").fontSize(9);
      doc.text("ESTIMATED TOTAL", 330, totalPosition + 10, { width: 120 });
      doc.fillColor("#4F46E5").fontSize(11);
      doc.text(formatCurrency(quotation.total, quotation.currency), 440, totalPosition + 9, { width: 100, align: "right" });

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
  return new Promise(async (resolve, reject) => {
    try {
      // Find customer details
      let customerDetails = { name: "Valued Customer" };
      try {
        const cust = await Customer.findById(invoice.customerId);
        if (cust) {
          customerDetails = {
            name: cust.name || "Valued Customer",
            person: cust.companyName || "",
            email: cust.email || "",
            phone: cust.phone || "",
            address: cust.requirement || ""
          };
        }
      } catch (err) {
        console.error("Failed to load customer details for Invoice PDF:", err);
      }

      // Find website details
      let websiteDetails = { name: "JTS Support", domain: "chat.jtsmiddleeast.com" };
      try {
        const web = await Website.findById(invoice.websiteId);
        if (web) {
          websiteDetails = {
            name: web.websiteName || "JTS Support",
            domain: web.domain || "chat.jtsmiddleeast.com"
          };
        }
      } catch (err) {
        console.error("Failed to load website details for Invoice PDF:", err);
      }

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

      drawHeader(doc, websiteDetails.name, "INVOICE", invoice.invoiceId, invoice.issuedAt || invoice.createdAt, websiteDetails.domain, { quotationId: invoice.quotationId });
      drawAddresses(doc, { name: websiteDetails.name, sub: "Finance Department" }, customerDetails);

      const tableTop = 240;
      doc.save();
      doc.roundedRect(50, tableTop, 495, 22, 4).fillColor("#4F46E5").fill();
      doc.restore();

      doc.fillColor("#FFFFFF").font("Helvetica-Bold");
      generateTableRow(doc, tableTop + 6, "Item Description", "Qty", "Price", "Total");
      doc.font("Helvetica");

      let i;
      for (i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const position = tableTop + 30 + (i * 26);

        if (i % 2 === 1) {
          doc.save();
          doc.roundedRect(50, position - 4, 495, 20, 2).fillColor("#F8FAFC").fill();
          doc.restore();
        }

        doc.fillColor("#334155");
        generateTableRow(
          doc,
          position,
          item.description,
          item.quantity.toString(),
          formatCurrency(item.price, invoice.currency),
          formatCurrency(item.total, invoice.currency)
        );
        doc.moveTo(50, position + 16).lineTo(545, position + 16).strokeColor("#F1F5F9").lineWidth(1).stroke();
      }

      const totalPosition = tableTop + 35 + (i * 26);
      doc.save();
      doc.roundedRect(320, totalPosition, 225, 30, 6).fillColor("#F1F5F9").fill();
      doc.restore();

      doc.font("Helvetica-Bold").fillColor("#1E293B").fontSize(9);
      doc.text("TOTAL AMOUNT PAID", 330, totalPosition + 10, { width: 120 });
      doc.fillColor("#4F46E5").fontSize(11);
      doc.text(formatCurrency(invoice.total, invoice.currency), 440, totalPosition + 9, { width: 100, align: "right" });

      drawFooter(doc, totalPosition + 40);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// --- HELPERS ---

function drawHeader(doc, titleLeft, titleRight, number, date, subLeft, extraDetails = {}) {
  // Let's draw a nice accent band at the top of the page
  doc.rect(0, 0, 595, 12).fill("#4F46E5");

  // Determine dynamic logo initial based on the company name
  const logoChar = titleLeft ? titleLeft.trim().charAt(0).toUpperCase() : "J";

  // Clean sub-header to remove protocols and trailing slashes for clean domain display
  let cleanSub = subLeft || "Official Customer Ledger";
  if (subLeft && (subLeft.startsWith("http://") || subLeft.startsWith("https://") || subLeft.includes("/"))) {
    try {
      cleanSub = subLeft.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
    } catch (err) {}
  }

  // Draw a premium vector logo badge
  doc.save();
  doc.roundedRect(50, 35, 36, 36, 8).fill("#4F46E5");
  doc.fontSize(18).fillColor("#FFFFFF").font("Helvetica-Bold").text(logoChar, 50, 44, { width: 36, align: "center" });
  doc.restore();

  // Company Name next to logo
  doc.fillColor("#1E293B")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(titleLeft, 98, 35)
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#64748B")
    .text(cleanSub, 98, 55);

  // Document Title and Info on the right
  doc.fontSize(22)
    .font("Helvetica-Bold")
    .fillColor("#4F46E5")
    .text(titleRight, 200, 35, { width: 345, align: "right" });

  const titleHeight = doc.heightOfString(titleRight, { width: 345 });
  let currentY = 35 + titleHeight + 4;

  doc.fontSize(9)
    .font("Helvetica")
    .fillColor("#475569")
    .text(`Reference No: ${number}`, 200, currentY, { width: 345, align: "right" });
  currentY += 14;

  if (extraDetails.quotationId) {
    doc.text(`Quotation No: ${extraDetails.quotationId}`, 200, currentY, { width: 345, align: "right" });
    currentY += 14;
  }
  if (extraDetails.invoiceNumber) {
    doc.text(`Invoice No: ${extraDetails.invoiceNumber}`, 200, currentY, { width: 345, align: "right" });
    currentY += 14;
  }

  doc.text(`Issued Date: ${new Date(date).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}`, 200, currentY, { width: 345, align: "right" });

  const headerBottomY = Math.max(100, currentY + 14);
  doc.moveTo(50, headerBottomY).lineTo(545, headerBottomY).strokeColor("#E2E8F0").lineWidth(1).stroke();
}

function drawAddresses(doc, from, to) {
  const topOffset = 120;

  // From Section Background Box
  doc.save();
  doc.roundedRect(50, topOffset, 235, 95, 8).fillColor("#F8FAFC").fill();
  doc.restore();

  doc.fontSize(8)
    .fillColor("#64748B")
    .font("Helvetica-Bold")
    .text("SENDER / SERVICE PROVIDER", 60, topOffset + 10)
    .fontSize(11)
    .fillColor("#0F172A")
    .font("Helvetica-Bold")
    .text(from.name || "Our Company", 60, topOffset + 24)
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#475569")
    .text(from.sub || "", 60, topOffset + 40, { width: 215 })
    .text("Tax ID: 32AAAAB1234C1Z0", 60, topOffset + 55)
    .text("United Arab Emirates", 60, topOffset + 70);

  // To Section Background Box
  doc.save();
  doc.roundedRect(310, topOffset, 235, 95, 8).fillColor("#F8FAFC").fill();
  doc.restore();

  doc.fontSize(8)
    .fillColor("#64748B")
    .font("Helvetica-Bold")
    .text("BILLED / DELIVERED TO", 320, topOffset + 10)
    .fontSize(11)
    .fillColor("#0F172A")
    .font("Helvetica-Bold")
    .text(to.name || "Valued Customer", 320, topOffset + 24)
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#475569");

  // Build client metadata string safely
  let addressText = "";
  if (to.person) addressText += `${to.person}\n`;
  if (to.email) addressText += `${to.email}\n`;
  if (to.phone) addressText += `${to.phone}\n`;
  if (to.address) addressText += to.address;
  else addressText += "UAE Corporate Office";

  doc.text(addressText, 320, topOffset + 40, { width: 215, height: 50 });
}

function generateTableRow(doc, y, item, qty, unitPrice, total) {
  doc.fontSize(9)
    .text(item, 60, y, { width: 230, align: "left" })
    .text(qty, 290, y, { width: 40, align: "center" })
    .text(unitPrice, 340, y, { width: 90, align: "right" })
    .text(total, 440, y, { width: 95, align: "right" });
}

function generateHr(doc, y) {
  doc.strokeColor("#F8FAFC")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}

function drawFooter(doc, lastContentY) {
  // Dynamically position footer just below content, capped at y=720 to stay within A4
  // A4 usable height ≈ 742pt (with 50pt margins); footer text takes ~50pt
  const footerTop = Math.min(Math.max(lastContentY || 680, 600), 720);

  // Footer divider
  doc.moveTo(50, footerTop).lineTo(545, footerTop).strokeColor("#E2E8F0").lineWidth(1).stroke();

  // Thanks message
  doc.fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#4F46E5")
    .text("Thank you for choosing JTS Support!", 50, footerTop + 10, { align: "center" });

  doc.fontSize(8)
    .font("Helvetica")
    .fillColor("#94A3B8")
    .text("For support, email: billing@jtsmiddleeast.com  •  Web: chat.jtsmiddleeast.com", 50, footerTop + 24, { align: "center" })
    .text("This is a computer-generated document. No signature is required.", 50, footerTop + 36, { align: "center" });
}

function formatCurrency(val, currencyCode = "INR") {
  const code = String(currencyCode || "INR").toUpperCase();
  const symbols = {
    USD: "$",
    EUR: "€",
    INR: "Rs. ",
    AED: "AED ",
    GBP: "£",
  };
  const symbol = symbols[code] || `${code} `;
  return symbol + Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
