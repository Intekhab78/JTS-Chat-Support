/**
 * CRM Data Export Utilities
 */

export const downloadCSV = (data, filename = "crm_export.csv") => {
  if (!data || !data.length) return;

  // 1. Extract headers (keys) from the first object
  const headers = Object.keys(data[0]).filter(k => 
    !["_id", "__v", "websiteId", "ownerId", "interactionHistory", "internalNotes", "tags"].includes(k)
  );

  // 2. Map data to CSV rows
  const rows = data.map(record => {
    return headers.map(header => {
      let val = record[header];
      
      // Handle special formatting
      if (val instanceof Date) val = val.toISOString().split("T")[0];
      if (typeof val === "object" && val !== null) val = JSON.stringify(val);
      
      // Escape commas and quotes for CSV safety
      const stringVal = String(val ?? "").replace(/"/g, '""');
      return `"${stringVal}"`;
    }).join(",");
  });

  // 3. Combine headers and rows
  const csvContent = [headers.join(","), ...rows].join("\n");

  // 4. Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportSummaryToCSV = (summary) => {
  if (!summary) return;
  
  const data = [
    { Label: "Total Leads", Value: summary.totalLeads },
    { Label: "Revenue", Value: summary.revenue },
    { Label: "Weighted Forecast", Value: summary.weightedRevenue },
    { Label: "Conversion Rate (%)", Value: summary.conversionRate },
    { Label: "Customer LTV", Value: summary.ltv },
    { Label: "CAC", Value: summary.cac }
  ];
  
  downloadCSV(data, `crm_summary_${new Date().toISOString().split("T")[0]}.csv`);
};
