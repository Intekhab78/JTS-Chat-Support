/**
 * Utility to calculate tax rates and amounts dynamically based on billing address state.
 */
export function calculateStateTax(subtotal, state = "", country = "India") {
  const normalizedState = (state || "").trim().toLowerCase();
  const normalizedCountry = (country || "India").trim().toLowerCase();

  let taxRate = 18; // default fallback tax rate %
  let taxBreakdown = {
    type: "GST",
    cgst: 0,
    sgst: 0,
    igst: 0,
    stateTax: 0
  };

  if (normalizedCountry === "india" || normalizedCountry === "in") {
    // If billing state is Delhi (assumed home state of the merchant seller)
    if (normalizedState === "delhi" || normalizedState === "dl") {
      taxRate = 18;
      taxBreakdown = {
        type: "CGST + SGST (Intra-state)",
        cgst: 9,
        sgst: 9,
        igst: 0,
        stateTax: 0
      };
    } else {
      // Inter-state sale: apply IGST 18%
      taxRate = 18;
      taxBreakdown = {
        type: "IGST (Inter-state)",
        cgst: 0,
        sgst: 0,
        igst: 18,
        stateTax: 0
      };
    }
  } else if (normalizedCountry === "united states" || normalizedCountry === "us" || normalizedCountry === "usa") {
    // US sales tax rates (simulated state slabs)
    if (normalizedState === "new york" || normalizedState === "ny") {
      taxRate = 8.875;
      taxBreakdown = { type: "NY Sales Tax", cgst: 0, sgst: 0, igst: 0, stateTax: 8.875 };
    } else if (normalizedState === "california" || normalizedState === "ca") {
      taxRate = 7.25;
      taxBreakdown = { type: "CA Sales Tax", cgst: 0, sgst: 0, igst: 0, stateTax: 7.25 };
    } else if (normalizedState === "texas" || normalizedState === "tx") {
      taxRate = 6.25;
      taxBreakdown = { type: "TX Sales Tax", cgst: 0, sgst: 0, igst: 0, stateTax: 6.25 };
    } else {
      taxRate = 5;
      taxBreakdown = { type: "US Standard Sales Tax", cgst: 0, sgst: 0, igst: 0, stateTax: 5 };
    }
  } else {
    // Fallback default tax rate
    taxRate = 10;
    taxBreakdown = { type: "VAT", cgst: 0, sgst: 0, igst: 0, stateTax: 10 };
  }

  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  return {
    taxRate,
    taxAmount,
    taxBreakdown
  };
}

export function applyTaxToInvoice(invoiceData) {
  const billingAddress = invoiceData.billingAddress || {};
  const state = billingAddress.state || "";
  const country = billingAddress.country || "India";

  // Calculate the correct tax rate based on state
  const { taxRate, taxBreakdown } = calculateStateTax(100, state, country);

  let calculatedSubtotal = 0;
  let calculatedTax = 0;

  const items = (invoiceData.items || []).map(item => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0; // percentage
    
    // Subtotal after item discount
    const itemSubtotal = Number((qty * price * (1 - discount / 100)).toFixed(2));
    const itemTaxAmount = Number(((itemSubtotal * taxRate) / 100).toFixed(2));
    const itemTotal = Number((itemSubtotal + itemTaxAmount).toFixed(2));

    calculatedSubtotal += itemSubtotal;
    calculatedTax += itemTaxAmount;

    return {
      productId: item.productId,
      sku: item.sku || "",
      description: item.description,
      quantity: qty,
      price,
      discount,
      taxRate,
      taxAmount: itemTaxAmount,
      subtotal: itemSubtotal,
      total: itemTotal
    };
  });

  const discountAmount = Number(invoiceData.discountAmount) || 0;
  const shippingCharges = Number(invoiceData.shippingCharges) || 0;
  const adjustment = Number(invoiceData.adjustment) || 0;

  const total = Number((calculatedSubtotal - discountAmount + calculatedTax + shippingCharges + adjustment).toFixed(2));

  return {
    items,
    subtotal: calculatedSubtotal,
    tax: calculatedTax,
    total
  };
}
