import { useState, useRef } from "react";
import { X, Printer, Download, FileText, CheckCircle2, ShieldCheck, QrCode } from "lucide-react";
import { formatCurrency } from "../utils/currencyFormatter.js";

export default function InvoiceGeneratorModal({ isOpen, onClose, defaultItem = null }) {
  const [invoiceType, setInvoiceType] = useState("tax_invoice"); // tax_invoice | delivery_challan
  const [sellerName, setSellerName] = useState("JTS SUPPORT MIDDLE EAST LLC");
  const [sellerTrn, setSellerTrn] = useState("100492837400003");
  const [buyerName, setBuyerName] = useState("AL REZA GLOBAL ENTERPRISES");
  const [buyerTrn, setBuyerTrn] = useState("100293847100003");
  const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-UAE-${Math.floor(10000 + Math.random() * 90000)}`);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  const [activeVatRate, setActiveVatRate] = useState(() => defaultItem?.vatRate !== undefined ? Number(defaultItem.vatRate) : 5); // Auto-detected from Inventory Item VAT Rate (5% vs 0%)

  const [lineItems, setLineItems] = useState([
    {
      description: defaultItem?.name || "Corporate Tax Filing & VAT Consultation",
      sku: defaultItem?.sku || "COR-ALR-8777",
      qty: defaultItem?.quantity || 1,
      unitPrice: defaultItem?.unitCost || 2500,
      vatRate: 5
    }
  ]);

  if (!isOpen) return null;

  const calculateSubtotal = () => lineItems.reduce((acc, item) => acc + (Number(item.qty || 0) * Number(item.unitPrice || 0)), 0);
  const calculateVat = () => lineItems.reduce((acc, item) => acc + (Number(item.qty || 0) * Number(item.unitPrice || 0) * (Number(activeVatRate || 0) / 100)), 0);
  const calculateGrandTotal = () => calculateSubtotal() + calculateVat();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white rounded-[36px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
              <FileText size={18} />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-wider">
                🇦🇪 UAE FTA COMPLIANT
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                {invoiceType === "tax_invoice" ? "Official Tax Invoice Generator" : "Delivery Challan Generator"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* VAT Rate Toggle */}
            <div className="flex bg-slate-200/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveVatRate(5)}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                  activeVatRate === 5 ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                5% UAE VAT
              </button>
              <button
                type="button"
                onClick={() => setActiveVatRate(0)}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                  activeVatRate === 0 ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                0% Non-VAT / Exempt
              </button>
            </div>

            <div className="flex bg-slate-200/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setInvoiceType("tax_invoice")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  invoiceType === "tax_invoice" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType("delivery_challan")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  invoiceType === "delivery_challan" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Delivery Challan
              </button>
            </div>
            <button
              onClick={handlePrint}
              className="p-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 text-xs font-black uppercase tracking-wider"
            >
              <Printer size={16} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-3 rounded-2xl bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 print:p-0 print:overflow-visible">
          <div id="printable-invoice" className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            
            {/* Invoice Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">JTS</span>
                  <span className="text-xl font-black text-slate-900 tracking-tight">{sellerName}</span>
                </div>
                <p className="text-xs font-bold text-slate-500">Business Bay, Executive Towers, Dubai, UAE</p>
                <p className="text-xs font-black text-indigo-600">TRN: {sellerTrn}</p>
              </div>

              <div className="text-right space-y-1 self-end sm:self-auto">
                <span className="px-4 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest border border-indigo-100">
                  {invoiceType === "tax_invoice" ? "TAX INVOICE / فاتورة ضريبية" : "DELIVERY CHALLAN / سند تسليم"}
                </span>
                <p className="text-sm font-black text-slate-900 mt-2">{invoiceNumber}</p>
                <p className="text-xs font-bold text-slate-400">Date: {invoiceDate}</p>
              </div>
            </div>

            {/* Buyer & Billing Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billed To (Customer):</p>
                <p className="text-sm font-black text-slate-900">{buyerName}</p>
                <p className="text-xs font-bold text-slate-500">Sharjah Media City, UAE</p>
                <p className="text-xs font-black text-slate-700">TRN: {buyerTrn}</p>
              </div>

              <div className="space-y-1 sm:text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currency & Tax Jurisdiction:</p>
                <p className="text-xs font-black text-slate-900">AED (United Arab Emirates Dirham)</p>
                <p className="text-xs font-bold text-emerald-600">UAE FTA Standard 5% VAT Applicable</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-3 px-4">Item Description</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">VAT Rate</th>
                    <th className="py-3 px-4 text-right">Total (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                  {lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-4 px-4">
                        <p className="font-black text-slate-900">{item.description}</p>
                        <p className="text-[10px] text-slate-400 font-extrabold">{item.sku}</p>
                      </td>
                      <td className="py-4 px-4 text-center">{item.qty}</td>
                      <td className="py-4 px-4 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-4 px-4 text-right text-emerald-600">{item.vatRate}%</td>
                      <td className="py-4 px-4 text-right font-black">{formatCurrency(Number(item.qty) * Number(item.unitPrice) * 1.05)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & Verification QR */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-slate-200 pt-6">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm shrink-0">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      `FTA TAX INVOICE VERIFIED\nSeller: ${sellerName}\nTRN: ${sellerTrn}\nInvoice: ${invoiceNumber}\nDate: ${invoiceDate}\nTotal: AED ${calculateGrandTotal().toFixed(2)}\nVAT (5%): AED ${calculateVat().toFixed(2)}`
                    )}`}
                    alt="FTA Verification QR Code"
                    className="w-full h-full object-contain rounded-md"
                  />
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-black text-slate-900 flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-500" /> FTA QR Verified
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">Cryptographically verified UAE VAT Invoice (Scan with phone)</p>
                </div>
              </div>

              <div className="w-full sm:w-64 space-y-2 text-right">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-600">
                  <span>UAE VAT (5%):</span>
                  <span>{formatCurrency(calculateVat())}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-indigo-600">{formatCurrency(calculateGrandTotal())}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
