const escapeHtml = (val) =>
  String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function formatPortalMoney(amount, currencyOrCode, currencySettings) {
  const num = Number(amount || 0);
  const rawCode =
    currencyOrCode && /^[A-Z]{3}$/.test(String(currencyOrCode).trim())
      ? String(currencyOrCode).trim()
      : currencySettings?.currencyCode && /^[A-Z]{3}$/.test(String(currencySettings.currencyCode).trim())
      ? String(currencySettings.currencyCode).trim()
      : null;

  const decimals = Number.isFinite(Number(currencySettings?.decimalPlaces))
    ? Number(currencySettings.decimalPlaces)
    : 2;

  if (currencySettings?.currencySymbol && (!currencyOrCode || currencyOrCode === currencySettings.currencyCode || currencyOrCode === currencySettings.currency)) {
    const formattedNum = num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return currencySettings.symbolPosition === "after"
      ? `${formattedNum} ${currencySettings.currencySymbol}`
      : `${currencySettings.currencySymbol} ${formattedNum}`;
  }

  const isoCode = rawCode || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: isoCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  } catch {
    return `${isoCode} ${num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
}

const formatAddr = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  return [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(", ");
};

export function printPortalDocument({
  docType = "INVOICE",
  docNumber = "",
  status = "",
  workspaceName = "Client Portal",
  issuedDate,
  dueDate,
  dueDateLabel = "Due Date",
  referenceLabel = "",
  referenceValue = "",
  customer = {},
  billingAddress = null,
  shippingAddress = null,
  items = [],
  subtotal,
  discount = 0,
  tax = 0,
  shipping = 0,
  total = 0,
  paidAmount = 0,
  notes = "",
  formatMoney
}) {
  const win = window.open("", "_blank", "width=900,height=780");
  if (!win) {
    return false;
  }

  const fmt = formatMoney || ((v) => Number(v || 0).toFixed(2));
  const statusUpper = String(status || "PENDING").toUpperCase();
  const isPositive = ["PAID", "ACCEPTED", "CONVERTED", "DELIVERED", "CONFIRMED"].includes(statusUpper);
  const badgeBg = isPositive ? "#ecfdf5" : "#fffbeb";
  const badgeColor = isPositive ? "#047857" : "#b45309";
  const badgeBorder = isPositive ? "#a7f3d0" : "#fde68a";

  const billingText = formatAddr(billingAddress);
  const shippingText = formatAddr(shippingAddress);

  const rowsHtml = items.length
    ? items
        .map((item, idx) => {
          const qty = Number(item.quantity || 1);
          const unitPrice = Number(item.price ?? item.unitPrice ?? 0);
          const lineTotal = Number(item.total ?? qty * unitPrice);
          const taxInfo = item.taxAmount
            ? `${fmt(item.taxAmount)}${item.taxRate ? ` (${item.taxRate}%)` : ""}`
            : item.taxRate
            ? `${item.taxRate}%`
            : "—";

          return `
            <tr>
              <td class="num">${idx + 1}</td>
              <td>
                <div class="item-name">${escapeHtml(item.description || item.name || item.title || "Item")}</div>
                ${item.sku ? `<div class="item-sku">SKU: ${escapeHtml(item.sku)}</div>` : ""}
              </td>
              <td class="right">${qty}</td>
              <td class="right">${escapeHtml(fmt(unitPrice))}</td>
              <td class="right">${escapeHtml(taxInfo)}</td>
              <td class="right strong">${escapeHtml(fmt(lineTotal))}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="6" class="empty">No line items recorded.</td></tr>`;

  const computedSubtotal = subtotal ?? total;
  const balanceDue = Math.max(0, Number(total || 0) - Number(paidAmount || 0));

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docType)} #${escapeHtml(docNumber)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 24px;
      font-size: 12px;
      line-height: 1.5;
      background: #ffffff;
    }
    .sheet { max-width: 780px; margin: 0 auto; }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .doc-meta { text-align: right; }
    .doc-title { font-size: 20px; font-weight: 800; color: #4f46e5; letter-spacing: 0.04em; margin: 0; }
    .doc-num { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .status-pill {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      background: ${badgeBg};
      color: ${badgeColor};
      border: 1px solid ${badgeBorder};
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .info-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .info-row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px; font-size: 11.5px; }
    .info-row span:first-child { color: #64748b; }
    .info-row span:last-child { font-weight: 600; color: #0f172a; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; border: 1px solid #e2e8f0; }
    thead th {
      background: #f1f5f9;
      color: #334155;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 9px 10px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    tbody td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .num { width: 32px; color: #64748b; }
    .right { text-align: right; }
    .strong { font-weight: 700; color: #0f172a; }
    .item-name { font-weight: 600; color: #0f172a; }
    .item-sku { font-size: 10px; color: #64748b; margin-top: 1px; }
    .empty { text-align: center; color: #64748b; padding: 18px; }
    .summary-wrap {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-top: 18px;
    }
    .notes-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11px;
      color: #475569;
    }
    .totals-box {
      width: 270px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      background: #ffffff;
    }
    .total-line { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11.5px; color: #475569; }
    .total-line.grand {
      border-top: 2px solid #0f172a;
      margin-top: 6px;
      padding-top: 8px;
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top-bar">
      <div>
        <div class="brand">${escapeHtml(workspaceName || "Client Portal")}</div>
        <div class="brand-sub">Official ${escapeHtml(docType.toLowerCase())} statement</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">${escapeHtml(docType)}</div>
        <div class="doc-num">#${escapeHtml(docNumber)}</div>
        <div class="status-pill">${escapeHtml(statusUpper)}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Billed To</div>
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${escapeHtml(customer?.name || "Customer")}</div>
        ${customer?.crn ? `<div class="info-row"><span>CRN</span><span>${escapeHtml(customer.crn)}</span></div>` : ""}
        ${customer?.email ? `<div class="info-row"><span>Email</span><span>${escapeHtml(customer.email)}</span></div>` : ""}
        ${customer?.phone ? `<div class="info-row"><span>Phone</span><span>${escapeHtml(customer.phone)}</span></div>` : ""}
        ${billingText ? `<div class="info-row"><span>Billing</span><span>${escapeHtml(billingText)}</span></div>` : ""}
        ${shippingText ? `<div class="info-row"><span>Shipping</span><span>${escapeHtml(shippingText)}</span></div>` : ""}
      </div>

      <div class="info-box">
        <div class="info-label">Document Details</div>
        <div class="info-row"><span>Reference #</span><span>#${escapeHtml(docNumber)}</span></div>
        <div class="info-row"><span>Issued Date</span><span>${issuedDate ? new Date(issuedDate).toLocaleDateString() : "—"}</span></div>
        <div class="info-row"><span>${escapeHtml(dueDateLabel)}</span><span>${dueDate ? new Date(dueDate).toLocaleDateString() : "Upon Receipt"}</span></div>
        ${referenceValue ? `<div class="info-row"><span>${escapeHtml(referenceLabel)}</span><span>${escapeHtml(referenceValue)}</span></div>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Description</th>
          <th class="right">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Tax</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="summary-wrap">
      ${notes ? `<div class="notes-box"><div class="info-label" style="margin-bottom:3px;">Notes</div><div>${escapeHtml(notes)}</div></div>` : `<div style="flex:1"></div>`}
      <div class="totals-box">
        <div class="total-line"><span>Subtotal</span><span>${escapeHtml(fmt(computedSubtotal))}</span></div>
        ${Number(discount || 0) > 0 ? `<div class="total-line"><span>Discount</span><span>-${escapeHtml(fmt(discount))}</span></div>` : ""}
        ${Number(tax || 0) > 0 ? `<div class="total-line"><span>Tax</span><span>${escapeHtml(fmt(tax))}</span></div>` : ""}
        ${Number(shipping || 0) > 0 ? `<div class="total-line"><span>Shipping</span><span>${escapeHtml(fmt(shipping))}</span></div>` : ""}
        <div class="total-line grand"><span>Grand Total</span><span>${escapeHtml(fmt(total))}</span></div>
        ${
          docType === "INVOICE"
            ? `<div class="total-line" style="color:#047857;margin-top:4px;"><span>Amount Paid</span><span>${escapeHtml(fmt(statusUpper === "PAID" && !paidAmount ? total : paidAmount))}</span></div>
               <div class="total-line" style="font-weight:700;"><span>Balance Due</span><span>${escapeHtml(fmt(statusUpper === "PAID" ? 0 : balanceDue))}</span></div>`
            : ""
        }
      </div>
    </div>

    <div class="footer">
      <span>Generated by ${escapeHtml(workspaceName || "Client Portal")}</span>
      <span>Printed on ${new Date().toLocaleDateString()}</span>
    </div>
  </div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
  return true;
}
