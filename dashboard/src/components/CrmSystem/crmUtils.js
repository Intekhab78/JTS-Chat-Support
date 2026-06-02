/**
 * CRM Logic Utilities
 */

export const isStaleLead = (customer) => {
  if (!customer?.updatedAt) return false;
  
  // A lead is stale if not won/lost and not updated in 7 days
  const isFinalStage = ["won", "lost"].includes(customer.status);
  if (isFinalStage) return false;

  const lastUpdate = new Date(customer.updatedAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return lastUpdate < sevenDaysAgo;
};

export const isHighValueLead = (customer) => {
  const HIGH_VALUE_THRESHOLD = 50000;
  return (customer.leadValue || 0) >= HIGH_VALUE_THRESHOLD;
};

export const getLeadTemperatureColor = (temp) => {
  switch (temp?.toLowerCase()) {
    case "hot": return "bg-rose-500";
    case "warm": return "bg-orange-500";
    case "cold": return "bg-sky-500";
    default: return "bg-slate-300";
  }
};
