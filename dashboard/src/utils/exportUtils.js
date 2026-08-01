import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// Helper to flatten nested objects into clean key-value primitives
const flattenObject = (obj, prefix = "") => {
  const result = {};
  if (!obj || typeof obj !== "object") return result;

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix} - ${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = "";
    } else if (typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
      if ("value" in value && ("trend" in value || Object.keys(value).length <= 3)) {
        // Handle metric object like { value: 10, trend: 5 }
        result[newKey] = String(value.value ?? "");
        if (value.trend !== undefined) {
          result[`${newKey} (Trend)`] = `${value.trend}%`;
        }
      } else {
        Object.assign(result, flattenObject(value, newKey));
      }
    } else if (Array.isArray(value)) {
      result[newKey] = value.map(v => (typeof v === "object" ? JSON.stringify(v) : String(v))).join("; ");
    } else {
      result[newKey] = String(value);
    }
  });

  return result;
};

// Normalize data array for clean tabular export
const normalizeExportData = (data) => {
  if (!data) return [];
  
  let rawList = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (typeof data === "object") {
    // If it has array properties, extract them or flatten the object
    const keys = Object.keys(data);
    const arrayKey = keys.find(k => Array.isArray(data[k]) && data[k].length > 0);
    if (arrayKey) {
      rawList = data[arrayKey];
    } else {
      rawList = [data];
    }
  }

  if (!rawList.length) return [];

  // Flatten every row item
  return rawList.map(item => {
    if (typeof item !== "object" || item === null) {
      return { Value: String(item) };
    }
    return flattenObject(item);
  });
};

export const exportToCSV = (data, filename = "Report") => {
  const cleanData = normalizeExportData(data);
  if (!cleanData.length) {
    alert("No records found to export for CSV.");
    return;
  }

  try {
    const csv = Papa.unparse(cleanData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("CSV Export error:", err);
    alert("Export CSV Error: " + err.message);
  }
};

export const downloadCSV = exportToCSV;

export const exportToExcel = (data, filename = "Report") => {
  const cleanData = normalizeExportData(data);
  if (!cleanData.length) {
    alert("No records found to export for Excel.");
    return;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(cleanData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics Report");
    XLSX.writeFile(workbook, `${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`);
  } catch (err) {
    console.error("Excel Export error:", err);
    alert("Export Excel Error: " + err.message);
  }
};

export const exportToPDF = (data, filename = "Report", title = "Executive Analytics Report") => {
  const cleanData = normalizeExportData(data);
  if (!cleanData.length) {
    alert("No records found to export for PDF.");
    return;
  }

  try {
    const doc = new jsPDF("p", "mm", "a4");

    // Header Band
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 28, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(String(title).toUpperCase(), 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`ENTERPRISE ANALYTICS SYSTEM • GENERATED ON: ${new Date().toLocaleString()}`, 14, 23);

    // Get Table Headers & Rows
    const headersSet = new Set();
    cleanData.forEach(row => Object.keys(row).forEach(k => headersSet.add(k)));
    const headers = Array.from(headersSet);

    const rows = cleanData.map(row => 
      headers.map(h => (row[h] !== undefined && row[h] !== null ? String(row[h]) : "-"))
    );

    autoTable(doc, {
      startY: 34,
      head: [headers.map(h => h.toUpperCase())],
      body: rows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: (dataArg) => {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("CONFIDENTIAL - ENTERPRISE BUSINESS REPORTING HUB", 14, 287);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, 196, 287, { align: "right" });
      }
    });

    doc.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
  } catch (err) {
    console.error("PDF Export error:", err);
    alert("Export PDF Error: " + err.message);
  }
};

export const exportSingleRecordPDF = (title, keyValues, filename = "Single_Record_Report") => {
  try {
    const doc = new jsPDF();
    
    // Header Branding
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(String(title).toUpperCase(), 14, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

    // AutoTable Key-Value Grid
    const rows = Object.entries(keyValues || {}).map(([key, val]) => [
      String(key).toUpperCase(),
      val !== undefined && val !== null ? String(val) : "-"
    ]);

    autoTable(doc, {
      startY: 38,
      head: [["FIELD / PROPERTY", "VALUE / DETAILS"]],
      body: rows,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { cellWidth: 110 }
      }
    });

    doc.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
  } catch (err) {
    console.error("Single Record PDF Export error:", err);
    alert("Export PDF Error: " + err.message);
  }
};
