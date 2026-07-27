import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export const exportToCSV = (data, filename) => {
  if (!data || !data.length) return;
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadCSV = exportToCSV;

export const exportToExcel = (data, filename) => {
  if (!data || !data.length) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (data, filename, title = "Report") => {
  if (!data || !data.length) return;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Timestamp
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

  // AutoTable
  const keys = Object.keys(data[0]);
  const rows = data.map(obj => keys.map(k => (obj[k] !== undefined && obj[k] !== null ? String(obj[k]) : "")));
  
  autoTable(doc, {
    startY: 40,
    head: [keys.map(k => k.toUpperCase())],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229] } // Indigo 600
  });

  doc.save(`${filename}.pdf`);
};
