import React from "react";
import CrmContainer from "./CrmSystem/CrmContainer.jsx";

/**
 * CRMManager - Re-architected Modular CRM Orchestrator
 * This component now serves as a lightweight entry point to the 
 * CrmSystem modular architecture.
 */
export default function CRMManager({ 
  websiteId = "", 
  initialLeadData = null, 
  highlightLeadId = null 
}) {
  return (
    <CrmContainer 
      websiteId={websiteId} 
      initialLeadData={initialLeadData} 
      highlightLeadId={highlightLeadId} 
    />
  );
}
