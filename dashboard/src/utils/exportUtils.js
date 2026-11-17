import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Helper to export any array of data to CSV / Excel format.
 * @param {Array} data - Array of objects or arrays to export
 * @param {Array|String} columns - Array of column specs [{ key: 'name', label: 'Item Name' }, ...] or filename if columns omitted
 * @param {String} filename - Output filename without extension
 */
export function exportToCsv(data = [], columns = [], filename = "export") {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  let actualColumns = columns;
  let actualFilename = filename;

  // Handle signature exportToCsv(data, filename)
  if (typeof columns === "string") {
    actualFilename = columns;
    actualColumns = [];
  }

  // Auto-derive columns from first row if not provided
  if (!Array.isArray(actualColumns) || actualColumns.length === 0) {
    const firstRow = data[0] || {};
    if (typeof firstRow === "object" && !Array.isArray(firstRow)) {
      actualColumns = Object.keys(firstRow).map(k => ({ key: k, label: k }));
    } else if (Array.isArray(firstRow)) {
      actualColumns = firstRow.map((_, idx) => ({ key: idx, label: `Column ${idx + 1}` }));
    }
  }

  // Normalize columns array
  actualColumns = (actualColumns || []).map(col => {
    if (typeof col === "string") return { key: col, label: col };
    return col;
  });

  // Generate Headers
  const headers = actualColumns.map(c => `"${String(c.label || c.key || "").replace(/"/g, '""')}"`).join(",");

  // Generate Rows
  const rows = data.map(item => {
    return actualColumns.map(col => {
      let val = col.accessor ? col.accessor(item) : (Array.isArray(item) ? item[col.key] : item?.[col.key]);
      if (val === null || val === undefined) val = "";
      if (typeof val === "object") val = JSON.stringify(val);
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(",");
  });

  const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${actualFilename.endsWith(".csv") ? actualFilename : `${actualFilename}.csv`}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const exportToCSV = exportToCsv;
export const exportToExcel = exportToCsv;

export function downloadCSV(content = "", filename = "export.csv") {
  if (typeof content === "object" && Array.isArray(content)) {
    return exportToCsv(content, Object.keys(content[0] || {}).map(k => ({ key: k, label: k })), filename);
  }
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to export any array of data to a real PDF document using jsPDF & autoTable.
 */
export function exportToPDF(data = [], columns = [], filename = "export", reportTitle = "ENTERPRISE INTELLIGENCE REPORT", options = {}) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  let actualColumns = columns;
  let actualFilename = filename;
  let titleText = reportTitle;
  let pdfOptions = options || {};

  // Handle signature exportToPDF(data, filename, reportTitle, options)
  if (typeof columns === "string") {
    if (typeof reportTitle === "object" && reportTitle !== null) {
      pdfOptions = reportTitle;
    }
    if (typeof filename === "string" && filename !== "export") {
      titleText = filename;
    }
    actualFilename = columns;
    actualColumns = [];
  }

  // Auto-derive columns from first row if not provided
  if (!Array.isArray(actualColumns) || actualColumns.length === 0) {
    const firstRow = data[0] || {};
    if (typeof firstRow === "object" && !Array.isArray(firstRow)) {
      actualColumns = Object.keys(firstRow).map(k => ({
        key: k,
        label: String(k).replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()
      }));
    } else if (Array.isArray(firstRow)) {
      actualColumns = firstRow.map((_, idx) => ({ key: idx, label: `Column ${idx + 1}` }));
    }
  }

  // Normalize columns array
  actualColumns = (actualColumns || []).map(col => {
    if (typeof col === "string") return { key: col, label: col };
    return col;
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const brandName = String(pdfOptions.brandName || "JTS SUPPORT").toUpperCase();
  const subtitle = pdfOptions.subtitle ? String(pdfOptions.subtitle).toUpperCase() : String(titleText || "ENTERPRISE REPORT").toUpperCase();
  const summaryCards = Array.isArray(pdfOptions.summaryCards) ? pdfOptions.summaryCards.slice(0, 4) : [];

  // Top Branded Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, "F");

  doc.setFillColor(79, 70, 229); // indigo-600 accent strip
  doc.rect(0, 30, 210, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(brandName, 14, 12.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254);
  doc.text(subtitle, 14, 20.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`GENERATED: ${reportDate}`, 196, 12.5, { align: "right" });
  doc.text(`ROWS: ${data.length}`, 196, 20.5, { align: "right" });

  let tableStartY = 38;

  // Optional Executive Summary KPI Cards Strip
  if (summaryCards.length > 0) {
    const gap = 3;
    const totalW = 182;
    const cardW = (totalW - gap * (summaryCards.length - 1)) / summaryCards.length;
    summaryCards.forEach((card, idx) => {
      const x = 14 + idx * (cardW + gap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, 36, cardW, 18, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(card.label || "").toUpperCase().slice(0, 22), x + 3, 42);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(String(card.value ?? "-").slice(0, 18), x + 3, 49.5);
    });
    tableStartY = 60;
  }

  // Prepare table headers & body
  const tableHeaders = [actualColumns.map(c => String(c.label || c.key || "").toUpperCase())];
  const tableBody = data.map(item => {
    return actualColumns.map(col => {
      let val = col.accessor ? col.accessor(item) : (Array.isArray(item) ? item[col.key] : item?.[col.key]);
      if (val === null || val === undefined) val = "-";
      if (typeof val === "object") val = JSON.stringify(val);
      return String(val);
    });
  });

  autoTable(doc, {
    startY: tableStartY,
    head: tableHeaders,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      cellPadding: 2.3
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 36, bottom: 18, left: 14, right: 14 },
    didDrawPage: (hookData) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`${brandName} • Confidential Analytics Report`, 14, 289);
      doc.text(`Page ${hookData.pageNumber} of ${pageCount}`, 196, 289, { align: "right" });
    }
  });

  const pdfName = actualFilename.toLowerCase().endsWith(".pdf") ? actualFilename : `${actualFilename}.pdf`;
  doc.save(pdfName);
}

export function exportSingleRecordPDF(record = {}, filename = "record") {
  exportToPDF([record], Object.keys(record).map(k => ({ key: k, label: k })), filename, "SINGLE COMPLIANCE RECORD PDF");
}
