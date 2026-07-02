/**
 * Calculates itemized taxes and totals for quotations and orders.
 * Supports CGST, SGST, IGST and flat/percentage discount schemes.
 */
export function calculateTotals({
  items = [],
  discountAmount = 0, // Order-level flat discount
  shippingCharges = 0,
  isInterState = false // true if Billing State !== Shipping State (IGST vs CGST+SGST)
}) {
  let subtotal = 0;
  let totalTax = 0;
  
  const processedItems = items.map(item => {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.price || 0);
    const itemSub = qty * unitPrice;
    
    // Item discount is treated as a percentage by default
    const discountPct = Number(item.discount || 0);
    const itemDiscountVal = (discountPct / 100) * itemSub;
    const taxableValue = itemSub - itemDiscountVal;
    
    const taxRate = Number(item.taxRate || 18);
    const itemTax = (taxRate / 100) * taxableValue;
    const itemTotal = taxableValue + itemTax;
    
    subtotal += itemSub;
    totalTax += itemTax;
    
    return {
      ...item,
      quantity: qty,
      price: unitPrice,
      discount: discountPct,
      taxRate,
      taxAmount: Math.round(itemTax * 100) / 100,
      subtotal: Math.round(taxableValue * 100) / 100,
      total: Math.round(itemTotal * 100) / 100
    };
  });

  const aggregateSubtotal = Math.round(subtotal * 100) / 100;
  // Apply order level flat discount
  const preTaxTotal = aggregateSubtotal - discountAmount;
  const grandTotal = preTaxTotal + totalTax + shippingCharges;

  // Split tax components
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  
  if (isInterState) {
    igst = totalTax;
  } else {
    cgst = totalTax / 2;
    sgst = totalTax / 2;
  }

  return {
    items: processedItems,
    subtotal: aggregateSubtotal,
    discountAmount,
    shippingCharges,
    tax: Math.round(totalTax * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    total: Math.round(grandTotal * 100) / 100
  };
}

/**
 * Determines required approval role level based on total discount percentage.
 */
export function determineApprovalRole(discountPercentage) {
  if (discountPercentage > 30) {
    return { level: "director", approvalStatus: "pending_director" };
  } else if (discountPercentage > 20) {
    return { level: "regional_manager", approvalStatus: "pending_regional_manager" };
  } else if (discountPercentage > 10) {
    return { level: "manager", approvalStatus: "pending_manager" };
  }
  return { level: "none", approvalStatus: "none" };
}
