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
export function exportToPDF(data = [], columns = [], filename = "export", reportTitle = "ENTERPRISE COMPLIANCE & INTELLIGENCE REPORT") {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  let actualColumns = columns;
  let actualFilename = filename;
  let titleText = reportTitle;

  // Handle signature exportToPDF(data, filename, reportTitle)
  if (typeof columns === "string") {
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

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  // Top Dark Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("JTS SUPPORT CRM", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254);
  doc.text(String(titleText || "FILTERED ENTERPRISE COMPLIANCE REPORT").toUpperCase(), 14, 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`DATE: ${reportDate}`, 196, 13, { align: "right" });
  doc.text(`RECORDS: ${data.length}`, 196, 21, { align: "right" });

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
    startY: 38,
    head: tableHeaders,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "left"
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 38, left: 14, right: 14 }
  });

  const pdfName = actualFilename.toLowerCase().endsWith(".pdf") ? actualFilename : `${actualFilename}.pdf`;
  doc.save(pdfName);
}

export function exportSingleRecordPDF(record = {}, filename = "record") {
  exportToPDF([record], Object.keys(record).map(k => ({ key: k, label: k })), filename, "SINGLE COMPLIANCE RECORD PDF");
}
