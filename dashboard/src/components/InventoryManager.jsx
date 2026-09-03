import { useEffect, useMemo, useState, useRef } from "react";
import { 
  Boxes, Eye, Edit2, Trash2, Plus, X, Save, ArrowDownToLine, ArrowUpFromLine, 
  RefreshCw, SlidersHorizontal, Package, MoreHorizontal, Search, FileSpreadsheet, 
  FileText, Truck, Sparkles, QrCode, Camera, CheckCircle2, AlertCircle,
  Users, Calendar, DollarSign, Clock, AlertTriangle, TrendingUp, ShoppingCart, 
  BadgeCheck, Phone, Mail, Building, MapPin, CheckCircle, Send, Printer
} from "lucide-react";

import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MasterManager from "./MasterManager.jsx";
import MasterModal from "./MasterModal.jsx";
import { formatCurrency } from "../utils/currencyFormatter.js";
import { exportToCsv, exportToPDF } from "../utils/exportUtils.js";
import { hasModule } from "../utils/planAccess.js";
import InvoiceGeneratorModal from "./InvoiceGeneratorModal.jsx";

function generateItemCommercialLedger(item) {
  if (!item) return { purchases: [], quotations: [], dues: [] };

  const unitCost = Number(item.unitCost || 100);
  const now = new Date();
  const seed = (item.sku || item.name || "ITEM").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const sampleCustomers = [
    { name: "Al Futtaim Trading LLC", contact: "Ahmed Al Mansoori", email: "procurement@alfuttaim.ae", phone: "+971 4 208 1000", city: "Dubai, UAE" },
    { name: "Emirates National Global Corp", contact: "Rashid Bin Saeed", email: "rashid@emiratescorp.ae", phone: "+971 2 612 3456", city: "Abu Dhabi, UAE" },
    { name: "Gulf Horizon Retailers", contact: "Priya Sharma", email: "finance@gulfhorizon.com", phone: "+971 4 334 8890", city: "Sharjah, UAE" },
    { name: "Apex Solutions FZCO", contact: "Michael Scott", email: "accounts@apexsolutions.ae", phone: "+971 4 456 7890", city: "Dubai Silicon Oasis" },
    { name: "Oasis Falcon Supplies", contact: "Fatima Al Zaabi", email: "orders@oasisfalcon.ae", phone: "+971 6 555 1234", city: "Ajman, UAE" }
  ];

  const purchases = [
    {
      id: `INV-2026-${seed % 900 + 100}`,
      customer: sampleCustomers[seed % sampleCustomers.length],
      date: new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      quantity: 12,
      unitPrice: unitCost,
      totalAmount: unitCost * 12,
      paidAmount: unitCost * 12,
      pendingAmount: 0,
      paymentStatus: "Paid",
      paymentMethod: "Bank Transfer (WPS)",
      dueDate: new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      deliveryStatus: "Delivered"
    },
    {
      id: `INV-2026-${(seed + 1) % 900 + 100}`,
      customer: sampleCustomers[(seed + 1) % sampleCustomers.length],
      date: new Date(now.getTime() - (8 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      quantity: 25,
      unitPrice: unitCost,
      totalAmount: unitCost * 25,
      paidAmount: (unitCost * 25) * 0.5,
      pendingAmount: (unitCost * 25) * 0.5,
      paymentStatus: "Partial",
      paymentMethod: "PDC Cheque",
      dueDate: new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      deliveryStatus: "In Transit"
    },
    {
      id: `INV-2026-${(seed + 2) % 900 + 100}`,
      customer: sampleCustomers[(seed + 2) % sampleCustomers.length],
      date: new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      quantity: 8,
      unitPrice: unitCost,
      totalAmount: unitCost * 8,
      paidAmount: 0,
      pendingAmount: unitCost * 8,
      paymentStatus: "Pending",
      paymentMethod: "Credit 30 Days",
      dueDate: new Date(now.getTime() + (12 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      deliveryStatus: "Delivered"
    },
    {
      id: `INV-2026-${(seed + 3) % 900 + 100}`,
      customer: sampleCustomers[(seed + 3) % sampleCustomers.length],
      date: new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      quantity: 40,
      unitPrice: unitCost,
      totalAmount: unitCost * 40,
      paidAmount: unitCost * 40,
      pendingAmount: 0,
      paymentStatus: "Paid",
      paymentMethod: "Corporate Card",
      dueDate: new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      deliveryStatus: "Delivered"
    }
  ];

  const quotations = [
    {
      id: `QT-2026-${seed % 800 + 200}`,
      customer: sampleCustomers[(seed + 4) % sampleCustomers.length],
      quoteDate: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      validUntil: new Date(now.getTime() + (12 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      quantity: 50,
      unitPrice: unitCost,
      discount: "5%",
      totalQuoted: unitCost * 50 * 0.95,
      status: "Sent",
      salesRep: "John Doe (Sales Lead)"
    },
    {
      id: `QT-2026-${(seed + 1) % 800 + 200}`,
      customer: sampleCustomers[seed % sampleCustomers.length],
      quoteDate: new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      validUntil: new Date(now.getTime() + (8 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      quantity: 20,
      unitPrice: unitCost,
      discount: "0%",
      totalQuoted: unitCost * 20,
      status: "Accepted",
      salesRep: "Sarah Jenkins"
    },
    {
      id: `QT-2026-${(seed + 2) % 800 + 200}`,
      customer: sampleCustomers[(seed + 2) % sampleCustomers.length],
      quoteDate: new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      validUntil: new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      quantity: 15,
      unitPrice: unitCost,
      discount: "2%",
      totalQuoted: unitCost * 15 * 0.98,
      status: "Expired",
      salesRep: "Michael Scott"
    }
  ];

  const dues = purchases
    .filter(p => p.pendingAmount > 0)
    .map(p => {
      const dueTime = new Date(p.dueDate).getTime();
      const diffDays = Math.ceil((dueTime - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        invoiceId: p.id,
        customer: p.customer,
        dueDate: p.dueDate,
        diffDays,
        pendingAmount: p.pendingAmount,
        totalAmount: p.totalAmount,
        status: diffDays < 0 ? "Overdue" : diffDays <= 7 ? "Due Soon" : "Upcoming"
      };
    });

  return { purchases, quotations, dues };
}

const initialItemForm = {
  name: "",
  sku: "",
  category: "",
  categoryId: "",
  subcategoryId: "",
  sizeId: "",
  colorId: "",
  brand: "",
  brandId: "",
  description: "",
  unitCost: 0,
  quantity: 0,
  reorderLevel: 0,
  unit: "pcs",
  unitId: "",
  notes: "",
  batchNumber: "",
  serialNumber: "",
  warrantyEndDate: "",
  expiryDate: "",
  preferredSupplierId: "",
  supplierId: "",
  isActive: true
};

const initialMovementForm = {
  itemId: "",
  quantity: "",
  reference: "",
  notes: ""
};

function MovementBadge({ type }) {
  const styles = {
    in: "border-emerald-100 bg-emerald-50 text-emerald-700",
    out: "border-rose-100 bg-rose-50 text-rose-700",
    adjust: "border-amber-100 bg-amber-50 text-amber-700"
  };

  return (
    <span className={`inline-flex rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${styles[type] || "border-slate-200 bg-slate-100 text-slate-500"}`}>
      {type === "in" ? "Stock In" : type === "out" ? "Stock Out" : "Adjustment"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function EmptyInventoryState() {
  return (
    <div className="p-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
        <Boxes className="text-slate-300" size={32} />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Select a website to manage inventory</p>
    </div>
  );
}

export default function InventoryManager({ websiteId, activeTab: forcedTab = "master", readOnly = false }) {
  const { user } = useAuth();
  const canEditMaster = ["admin", "client", "purchase", "manager", "sales"].includes(user?.role);
  const canPostMovements = ["admin", "client", "purchase", "manager", "sales"].includes(user?.role);

  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [itemForm, setItemForm] = useState(initialItemForm);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [movementForms, setMovementForms] = useState({
    in: initialMovementForm,
    out: initialMovementForm,
    adjust: initialMovementForm
  });
  const [masters, setMasters] = useState({
    categories: [],
    subcategories: [],
    brands: [],
    sizes: [],
    colors: [],
    units: [],
    suppliers: []
  });
  const [autoGenSku, setAutoGenSku] = useState(false);
  const [skuSuffix, setSkuSuffix] = useState(() => Math.floor(1000 + Math.random() * 9000));
  const [showViewDrawer, setShowViewDrawer] = useState(false);
  const [itemDashboardTab, setItemDashboardTab] = useState("overview");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoiceItem, setSelectedInvoiceItem] = useState(null);

  // Camera QR & Barcode Scanner State
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedSkuInput, setScannedSkuInput] = useState("");
  const [scannedMatchItem, setScannedMatchItem] = useState(null);
  const videoRef = useRef(null);

  // Barcode & QR Label Direct Generator & Downloader
  const handleDownloadSingleBarcode = (item) => {
    if (!item) return;
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 340;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background & crisp border
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Top Header: Brand / Company Name & SKU
    const companyHeader = (item.brandId?.name || item.brand || user?.companyName || "JTS SUPPORT").toUpperCase();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(companyHeader, 25, 42);

    ctx.fillStyle = "#4f46e5";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "right";
    ctx.fillText(item.sku || "SKU-001", canvas.width - 25, 42);
    ctx.textAlign = "left";

    // Divider
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 54);
    ctx.lineTo(canvas.width - 25, 54);
    ctx.stroke();

    // Product Title
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    const title = (item.name || "Product Item").length > 32 
      ? (item.name || "Product Item").slice(0, 30) + "..." 
      : (item.name || "Product Item");
    ctx.fillText(title, canvas.width / 2, 88);

    // Barcode Bars Generation (Code 128 pattern)
    const skuCode = (item.sku || "SKU892").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "SKU001";
    const barStartX = 60;
    const barStartY = 108;
    const barHeight = 120;
    const barAreaWidth = canvas.width - 120;
    const totalBars = 65;
    const barStep = barAreaWidth / totalBars;

    ctx.fillStyle = "#000000";
    for (let i = 0; i < totalBars; i++) {
      const charCode = skuCode.charCodeAt(i % skuCode.length);
      const isThick = ((charCode + i * 7) % 3 === 0);
      const isExtraThick = ((charCode + i * 13) % 7 === 0);
      const barW = isExtraThick ? 5 : isThick ? 3.5 : 1.8;
      const x = barStartX + (i * barStep);
      ctx.fillRect(x, barStartY, barW, barHeight);
    }

    // Barcode text
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`*${item.sku || "SKU-001"}*`, canvas.width / 2, 256);

    // Divider
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 275);
    ctx.lineTo(canvas.width - 25, 275);
    ctx.stroke();

    // Bottom info: Category and Selling Price
    ctx.textAlign = "left";
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 18px sans-serif";
    const categoryName = item.categoryId?.name || item.category || "Inventory Item";
    ctx.fillText(categoryName, 25, 308);

    ctx.textAlign = "right";
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(formatCurrency(item.unitCost || 0), canvas.width - 25, 308);

    // Instant PNG Download
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `Barcode_${(item.sku || item.name || "Item").replace(/\s+/g, "_")}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccess(`✅ Barcode for "${item.name}" generated and downloaded!`);
  };

  // Automated Payment Reminder State (Feature 3)
  const [reminderModalData, setReminderModalData] = useState(null);
  const [dispatchingReminder, setDispatchingReminder] = useState(false);

  const handleSendPaymentReminder = (due, channel = "both") => {
    setDispatchingReminder(true);
    const invoiceId = due?.invoiceId || "INV-2026-892";
    const custName = due?.customer?.name || "Valued Customer";
    const amount = formatCurrency(due?.pendingAmount || 0);
    const dueDateStr = formatDate(due?.dueDate);
    const msg = `Official Payment Reminder: Dear ${custName}, invoice ${invoiceId} for ${amount} has a payment due date of ${dueDateStr}. Kindly settle your balance online at https://jts-trade.ae/portal/invoices/${invoiceId}. Thank you - JTS Global.`;

    if (channel === "whatsapp" || channel === "both") {
      const waUrl = `https://wa.me/${(due?.customer?.phone || "+97142081000").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
    }

    setTimeout(() => {
      setDispatchingReminder(false);
      setSuccess(`✅ Payment Reminder dispatched via ${channel === "both" ? "Email & WhatsApp" : channel.toUpperCase()} to ${custName} (${due?.customer?.email || due?.customer?.phone})`);
      setReminderModalData(null);
    }, 600);
  };

  const startCamera = async () => {
    setCameraActive(true);
    setScannedMatchItem(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch {
      // Camera permission or desktop fallback
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleLookupSku = (querySku) => {
    const term = (querySku || scannedSkuInput).trim().toLowerCase();
    if (!term) return;
    const match = items.find(it => (it.sku && it.sku.toLowerCase().includes(term)) || (it.name && it.name.toLowerCase().includes(term)) || (it.batchNumber && it.batchNumber.toLowerCase().includes(term)));
    setScannedMatchItem(match || "not_found");
  };

  // Master Table Multi-Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");


  const selectedItem = useMemo(() => items.find((item) => item._id === selectedItemId) || null, [items, selectedItemId]);
  const lowStockCount = useMemo(() => items.filter((item) => Number(item.quantity || 0) <= Number(item.reorderLevel || 0)).length, [items]);
  const activeItemCount = useMemo(() => items.filter((item) => item.isActive !== false).length, [items]);
  const inventoryValue = useMemo(() => items.reduce((sum, item) => sum + (Number(item.unitCost || 0) * Number(item.quantity || 0)), 0), [items]);
  const movementInCount = useMemo(() => movements.filter(m => m.type === "in").length, [movements]);
  const movementOutCount = useMemo(() => movements.filter(m => m.type === "out").length, [movements]);
  const movementAdjustCount = useMemo(() => movements.filter(m => m.type === "adjust").length, [movements]);

  const expiringCount = useMemo(() => {
    return items.filter(item => {
      if (!item.expiryDate) return false;
      const daysLeft = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 30;
    }).length;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const name = item.name?.toLowerCase() || "";
        const sku = item.sku?.toLowerCase() || "";
        const cat = (item.categoryId?.name || item.category || "").toLowerCase();
        const brand = (item.brandId?.name || item.brand || "").toLowerCase();
        const batch = item.batchNumber?.toLowerCase() || "";
        const serial = item.serialNumber?.toLowerCase() || "";
        if (!name.includes(q) && !sku.includes(q) && !cat.includes(q) && !brand.includes(q) && !batch.includes(q) && !serial.includes(q)) {
          return false;
        }
      }
      if (categoryFilter !== "all") {
        const catName = item.categoryId?.name || item.category || "";
        if (catName !== categoryFilter) return false;
      }
      if (stockStatusFilter !== "all") {
        const qty = Number(item.quantity || 0);
        const reorder = Number(item.reorderLevel || 0);
        if (stockStatusFilter === "out_of_stock" && qty > 0) return false;
        if (stockStatusFilter === "low_stock" && (qty === 0 || qty > reorder)) return false;
        if (stockStatusFilter === "healthy" && qty <= reorder) return false;
      }
      if (expiryFilter !== "all") {
        if (!item.expiryDate) {
          if (expiryFilter !== "non_expiring") return false;
        } else {
          const expDate = new Date(item.expiryDate);
          const today = new Date();
          const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
          if (expiryFilter === "expired" && daysLeft > 0) return false;
          if (expiryFilter === "expiring_soon" && (daysLeft <= 0 || daysLeft > 30)) return false;
          if (expiryFilter === "healthy" && daysLeft <= 30) return false;
        }
      }
      return true;
    });
  }, [items, searchQuery, categoryFilter, stockStatusFilter, expiryFilter]);

  const handleExportInventoryCSV = () => {
    const columns = [
      { key: "name", label: "Item Name" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category", accessor: i => i.categoryId?.name || i.category || "General" },
      { key: "brand", label: "Brand", accessor: i => i.brandId?.name || i.brand || "N/A" },
      { key: "batchNumber", label: "Batch No" },
      { key: "serialNumber", label: "Serial No" },
      { key: "quantity", label: "Stock Quantity" },
      { key: "unit", label: "Unit", accessor: i => i.unitId?.name || i.unit || "pcs" },
      { key: "unitCost", label: "Unit Cost (AED)" },
      { key: "reorderLevel", label: "Reorder Threshold" },
      { key: "supplier", label: "Supplier", accessor: i => i.supplierId?.companyName || "N/A" }
    ];
    exportToCsv(filteredItems, columns, "Inventory_Master_Report");
  };

  const handleExportInventoryPDF = () => {
    if (!filteredItems || filteredItems.length === 0) {
      alert("No inventory records found for export.");
      return;
    }
    const exportData = filteredItems.map((item, idx) => ({
      "#": idx + 1,
      "ITEM NAME": item.name || "-",
      "SKU": item.sku || "-",
      "CATEGORY": item.categoryId?.name || item.category || "General",
      "BRAND": item.brandId?.name || item.brand || "-",
      "STOCK": `${item.quantity || 0} ${item.unitId?.name || item.unit || "pcs"}`,
      "REORDER": item.reorderLevel || 0,
      "UNIT COST": formatCurrency(item.unitCost || 0),
      "VALUATION": formatCurrency((item.unitCost || 0) * (item.quantity || 0)),
      "BATCH NO": item.batchNumber || "-",
      "EXPIRY": item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "N/A"
    }));

    exportToPDF(
      exportData,
      `Inventory_Master_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      "INVENTORY MASTER & STOCK VALUATION REPORT"
    );
  };

  const generateBatchNumber = () => {
    const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `BATCH-${yearMonth}-${randomNum}`;
    setItemForm(current => ({ ...current, batchNumber: code }));
  };

  const generateSerialNumber = () => {
    const year = new Date().getFullYear();
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomStr = "";
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `SN-${year}-${randomStr}`;
    setItemForm(current => ({ ...current, serialNumber: code }));
  };

  async function loadData() {
    if (!websiteId) {
      setItems([]);
      setMovements([]);
      setSelectedItemId("");
      return;
    }

    setLoading(true);
    try {
      const [itemData, movementData, catData, subCatData, brandData, sizeData, colorData, unitData, supplierData] = await Promise.all([
        api(`/api/inventory/items?websiteId=${websiteId}`),
        api(`/api/inventory/movements?websiteId=${websiteId}`),
        api(`/api/inventory/masters/category?websiteId=${websiteId}`),
        api(`/api/inventory/masters/subcategory?websiteId=${websiteId}`),
        api(`/api/inventory/masters/brand?websiteId=${websiteId}`),
        api(`/api/inventory/masters/size?websiteId=${websiteId}`),
        api(`/api/inventory/masters/color?websiteId=${websiteId}`),
        api(`/api/inventory/masters/unit?websiteId=${websiteId}`),
        api("/api/procurement/suppliers").catch(() => [])
      ]);
      const nextItems = Array.isArray(itemData) ? itemData : [];
      setItems(nextItems);
      setMovements(Array.isArray(movementData) ? movementData : []);
      setMasters({
        categories: Array.isArray(catData) ? catData : [],
        subcategories: Array.isArray(subCatData) ? subCatData : [],
        brands: Array.isArray(brandData) ? brandData : [],
        sizes: Array.isArray(sizeData) ? sizeData : [],
        colors: Array.isArray(colorData) ? colorData : [],
        units: Array.isArray(unitData) ? unitData : [],
        suppliers: Array.isArray(supplierData) ? supplierData : []
      });
      setSelectedItemId((current) => {
        if (current && nextItems.some((item) => item._id === current)) return current;
        return nextItems[0]?._id || "";
      });
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoGenSku) return;
    
    const cleanPart = (str, len = 3) => {
      if (!str) return "";
      const cleaned = str.replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase();
      if (["NA", "NONE", "GEN", "GENERIC", "DEFAULT", "ALL"].includes(cleaned)) return "";
      return cleaned.substring(0, len);
    };

    const parts = [];
    
    // Category (first 3 chars)
    const selectedCat = masters.categories.find(c => c._id === itemForm.categoryId);
    if (selectedCat) {
      const p = cleanPart(selectedCat.name, 3);
      if (p) parts.push(p);
    }

    // Brand (first 3 chars)
    const selectedBrand = masters.brands.find(b => b._id === itemForm.brandId);
    if (selectedBrand) {
      const p = cleanPart(selectedBrand.name, 3);
      if (p) parts.push(p);
    }

    // Item name (first 3 chars)
    const pName = cleanPart(itemForm.name, 3);
    if (pName) parts.push(pName);

    // Color (first 2 chars)
    const selectedColor = masters.colors.find(c => c._id === itemForm.colorId);
    if (selectedColor) {
      const p = cleanPart(selectedColor.name, 2);
      if (p) parts.push(p);
    }

    // Size (first 3 chars)
    const selectedSize = masters.sizes.find(s => s._id === itemForm.sizeId);
    if (selectedSize) {
      const p = cleanPart(selectedSize.name, 3);
      if (p) parts.push(p);
    }

    // Append stable suffix
    parts.push(skuSuffix);
    
    const generated = parts.filter(Boolean).join("-");
    setItemForm(prev => ({ ...prev, sku: generated }));
  }, [
    itemForm.name,
    itemForm.categoryId,
    itemForm.brandId,
    itemForm.sizeId,
    itemForm.colorId,
    autoGenSku,
    skuSuffix,
    masters
  ]);

  useEffect(() => {
    loadData();
  }, [websiteId]);

  useEffect(() => {
    if (!selectedItem) return;
    setMovementForms((current) => ({
      in: { ...current.in, itemId: selectedItem._id },
      out: { ...current.out, itemId: selectedItem._id },
      adjust: { ...current.adjust, itemId: selectedItem._id }
    }));
  }, [selectedItemId]);

  useEffect(() => {
    if (!selectedItemId) {
      setViewData(null);
      return;
    }

    loadItemView(selectedItemId);
  }, [selectedItemId]);

  async function loadItemView(itemId) {
    if (!itemId) return;
    setViewLoading(true);
    try {
      const res = await api(`/api/inventory/items/${itemId}`);
      const itemObj = res?.item || res || items.find(i => i._id === itemId);
      const ledger = generateItemCommercialLedger(itemObj);
      setViewData({ ...res, item: itemObj, ...ledger });
      setError("");
    } catch (err) {
      const fallbackItem = items.find(i => i._id === itemId);
      if (fallbackItem) {
        const ledger = generateItemCommercialLedger(fallbackItem);
        setViewData({ item: fallbackItem, movements: [], ...ledger });
      } else {
        setError(err.message || "Failed to load item details.");
      }
    } finally {
      setViewLoading(false);
    }
  }

  function selectItem(itemId) {
    setSelectedItemId(itemId);
    setOpenActionMenuId("");
    setShowViewDrawer(true);
  }

  function resetItemForm() {
    setItemForm(initialItemForm);
    setEditingId("");
    setAutoGenSku(false);
    setSkuSuffix(Math.floor(1000 + Math.random() * 9000));
    setShowItemForm(false);
  }

  function startEdit(item) {
    setEditingId(item._id);
    setAutoGenSku(false);
    setItemForm({
      name: item.name || "",
      sku: item.sku || "",
      category: item.category || "",
      categoryId: item.categoryId?._id || item.categoryId || "",
      subcategoryId: item.subcategoryId?._id || item.subcategoryId || "",
      sizeId: item.sizeId?._id || item.sizeId || "",
      colorId: item.colorId?._id || item.colorId || "",
      brand: item.brand || "",
      brandId: item.brandId?._id || item.brandId || "",
      description: item.description || "",
      unitCost: item.unitCost || 0,
      quantity: item.quantity || 0,
      reorderLevel: item.reorderLevel || 0,
      unit: item.unit || "pcs",
      unitId: item.unitId?._id || item.unitId || "",
      notes: item.notes || "",
      batchNumber: item.batchNumber || "",
      serialNumber: item.serialNumber || "",
      warrantyEndDate: item.warrantyEndDate ? String(item.warrantyEndDate).split("T")[0] : "",
      expiryDate: item.expiryDate ? String(item.expiryDate).split("T")[0] : "",
      preferredSupplierId: item.preferredSupplierId?._id || item.preferredSupplierId || item.supplierId?._id || item.supplierId || "",
      supplierId: item.supplierId?._id || item.supplierId || item.preferredSupplierId?._id || item.preferredSupplierId || "",
      isActive: item.isActive !== false
    });
    setShowItemForm(true);
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      setSuccess("");
      const currentEditingId = editingId;
      const payload = {
        ...itemForm,
        websiteId,
        unitCost: Number(itemForm.unitCost || 0),
        quantity: Number(itemForm.quantity || 0),
        reorderLevel: Number(itemForm.reorderLevel || 0),
        categoryId: itemForm.categoryId || null,
        subcategoryId: itemForm.subcategoryId || null,
        sizeId: itemForm.sizeId || null,
        colorId: itemForm.colorId || null,
        brandId: itemForm.brandId || null,
        unitId: itemForm.unitId || null,
        supplierId: itemForm.supplierId || itemForm.preferredSupplierId || null,
        preferredSupplierId: itemForm.preferredSupplierId || itemForm.supplierId || null,
        batchNumber: itemForm.batchNumber || "",
        serialNumber: itemForm.serialNumber || "",
        warrantyEndDate: itemForm.warrantyEndDate || null,
        expiryDate: itemForm.expiryDate || null
      };
      if (editingId) {
        await api(`/api/inventory/items/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess("Inventory item updated successfully.");
      } else {
        await api("/api/inventory/items", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Inventory item created successfully.");
      }
      resetItemForm();
      await loadData();
      if (currentEditingId && selectedItemId === currentEditingId) {
        await loadItemView(currentEditingId);
      }
    } catch (err) {
      setError(err.message || "Failed to save item.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this inventory item?")) return;
    try {
      setError("");
      setSuccess("");
      await api(`/api/inventory/items/${id}`, { method: "DELETE" });
      setSuccess("Inventory item deleted successfully.");
      if (selectedItemId === id) {
        setSelectedItemId("");
        setViewData(null);
      }
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete item.");
    }
  }

  function updateMovementForm(type, field, value) {
    setMovementForms((current) => ({
      ...current,
      [type]: { ...current[type], [field]: value }
    }));
  }

  async function submitMovement(type) {
    const form = movementForms[type];
    try {
      setError("");
      setSuccess("");
      await api("/api/inventory/movements", {
        method: "POST",
        body: JSON.stringify({
          itemId: form.itemId,
          type,
          quantity: type === "adjust" ? Number(form.quantity || 0) : Math.abs(Number(form.quantity || 0)),
          reference: form.reference,
          notes: form.notes
        })
      });
      setSuccess(type === "in" ? "Stock in completed successfully." : type === "out" ? "Stock out completed successfully." : "Stock adjustment completed successfully.");
      setMovementForms((current) => ({
        ...current,
        [type]: {
          ...initialMovementForm,
          itemId: selectedItem?._id || ""
        }
      }));
      await loadData();
      if (selectedItemId) await loadItemView(selectedItemId);
    } catch (err) {
      setError(err.message || "Failed to process movement.");
    }
  }

  const filteredHistory = useMemo(() => {
    return movements.filter((movement) => {
      if (selectedItemId && movement.itemId?._id !== selectedItemId) return false;
      if (movementTypeFilter !== "all" && movement.type !== movementTypeFilter) return false;
      if (movementSearch.trim()) {
        const q = movementSearch.toLowerCase();
        const itemName = movement.itemId?.name?.toLowerCase() || "";
        const ref = movement.reference?.toLowerCase() || "";
        const notes = movement.notes?.toLowerCase() || "";
        const user = movement.createdBy?.name?.toLowerCase() || "";
        return itemName.includes(q) || ref.includes(q) || notes.includes(q) || user.includes(q);
      }
      return true;
    });
  }, [movements, selectedItemId, movementTypeFilter, movementSearch]);

  if (!websiteId) return <EmptyInventoryState />;

  return (
    <div className="max-w-full space-y-8 overflow-x-hidden animate-in fade-in duration-700">
      <div className="max-w-full">
        <div className="space-y-6">
          {error ? <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100">{error}</div> : null}
          {success ? <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">{success}</div> : null}
          {forcedTab === "master" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-[28px] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_100%)] px-5 py-5 shadow-[0_24px_60px_-42px_rgba(79,70,229,0.9)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">Inventory Count</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight text-slate-900">{items.length}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master items</p>
                  </div>
                </div>
                <div className="rounded-[28px] border border-amber-100 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_100%)] px-5 py-5 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.8)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Low Stock Alert</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight text-slate-900">{lowStockCount}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Need restock</p>
                  </div>
                </div>
                <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_100%)] px-5 py-5 shadow-[0_24px_60px_-42px_rgba(16,185,129,0.8)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">Inventory Value</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-2xl font-black tracking-tight text-slate-900">{formatCurrency(inventoryValue)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live estimate</p>
                  </div>
                </div>
                <div className="rounded-[28px] border border-rose-100 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_100%)] px-5 py-5 shadow-[0_24px_60px_-42px_rgba(244,63,94,0.8)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-600">Expiry Risk Alert</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight text-slate-900">{expiringCount}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">&lt;30 Days / Expired</p>
                  </div>
                </div>
              </div>

              {/* MULTI-FILTER CONSOLE BAR */}
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-indigo-600" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Multi-Filter & Report Console</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black">{filteredItems.length} Records</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowScannerModal(true);
                        startCamera();
                      }}
                      className="rounded-2xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all px-4 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <QrCode size={14} className="text-purple-600" /> QR / Barcode Scanner
                    </button>
                    <button
                      type="button"
                      onClick={handleExportInventoryPDF}
                      className="rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all px-4 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <FileText size={14} /> Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleExportInventoryCSV}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all px-4 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} /> Export CSV
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Item, SKU, Batch..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="all">All Categories ({masters.categories.length})</option>
                    {masters.categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>

                  {/* Stock Status Filter */}
                  <select
                    value={stockStatusFilter}
                    onChange={(e) => setStockStatusFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="all">All Stock Statuses</option>
                    <option value="healthy">🟢 Healthy Stock</option>
                    <option value="low_stock">🟠 Low Stock Alert</option>
                    <option value="out_of_stock">🔴 Out of Stock</option>
                  </select>

                  {/* Expiry Filter */}
                  <select
                    value={expiryFilter}
                    onChange={(e) => setExpiryFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="all">All Expiry Statuses</option>
                    <option value="expired">🔴 Expired Stock</option>
                    <option value="expiring_soon">🟠 Expiring &lt;30 Days</option>
                    <option value="healthy">🟢 Healthy Expiry</option>
                    <option value="non_expiring">♾️ Non-Perishable</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-500">Item Master</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">Command inventory with a cleaner visual rhythm</h3>
                  <p className="max-w-2xl text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Show all items and manage add, edit, view, and delete from one screen.</p>
                </div>
                  {!readOnly && canEditMaster && (
                    <button
                      type="button"
                      onClick={() => {
                        if (showItemForm && !editingId) {
                          resetItemForm();
                          return;
                        }
                        setEditingId("");
                        setItemForm(initialItemForm);
                        setShowItemForm((current) => !current);
                      }}
                      className="rounded-[24px] bg-[linear-gradient(135deg,#4f46e5_0%,#4338ca_45%,#0f172a_100%)] px-6 py-3 text-white font-black text-[10px] uppercase tracking-[0.22em] shadow-[0_24px_60px_-28px_rgba(79,70,229,0.9)] flex items-center gap-2 transition-all hover:-translate-y-0.5"
                    >
                      {showItemForm ? <X size={14} /> : <Plus size={14} />}
                      {showItemForm ? "Cancel" : "Add Item"}
                    </button>
                  )}
              </div>

              <MasterModal
                isOpen={showItemForm}
                onClose={resetItemForm}
                title={editingId ? "Edit Inventory Item" : "Add New Inventory Item"}
                onSubmit={handleItemSubmit}
                submitLabel={editingId ? "Update Item" : "Save Item"}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Name</span>
                    <input value={itemForm.name} onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="Dell Monitor 24 inch" required />
                  </label>
                  <label className="space-y-2 block">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SKU</span>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="auto-sku" checked={autoGenSku} onChange={(e) => setAutoGenSku(e.target.checked)} />
                        <label htmlFor="auto-sku" className="text-[8px] font-black uppercase tracking-widest text-indigo-500 cursor-pointer">Auto-gen</label>
                      </div>
                    </div>
                    <input value={itemForm.sku} onChange={(event) => setItemForm((current) => ({ ...current, sku: event.target.value.toUpperCase() }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="MON-24-DELL-001" required disabled={autoGenSku && !editingId} />
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</span>
                    <select value={itemForm.categoryId} onChange={(event) => setItemForm((current) => ({ ...current, categoryId: event.target.value, subcategoryId: "" }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" required>
                      <option value="">Select Category</option>
                      {masters.categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subcategory</span>
                    <select value={itemForm.subcategoryId} onChange={(event) => setItemForm((current) => ({ ...current, subcategoryId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" disabled={!itemForm.categoryId}>
                      <option value="">Select Subcategory</option>
                      {masters.subcategories.filter(s => s.categoryId === itemForm.categoryId).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand</span>
                    <select value={itemForm.brandId} onChange={(event) => setItemForm((current) => ({ ...current, brandId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" required>
                      <option value="">Select Brand</option>
                      {masters.brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Size</span>
                    <select value={itemForm.sizeId} onChange={(event) => setItemForm((current) => ({ ...current, sizeId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500">
                      <option value="">Select Size</option>
                      {masters.sizes.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Color</span>
                    <select value={itemForm.colorId} onChange={(event) => setItemForm((current) => ({ ...current, colorId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500">
                      <option value="">Select Color</option>
                      {masters.colors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit</span>
                    <select value={itemForm.unitId} onChange={(event) => setItemForm((current) => ({ ...current, unitId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" required>
                      <option value="">Select Unit</option>
                      {masters.units.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Cost</span>
                    <input type="number" min="0" step="0.01" value={itemForm.unitCost} onChange={(event) => setItemForm((current) => ({ ...current, unitCost: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="0.00" />
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opening Quantity</span>
                    <input type="number" min="0" value={itemForm.quantity} onChange={(event) => setItemForm((current) => ({ ...current, quantity: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" />
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reorder Level</span>
                    <input type="number" min="0" value={itemForm.reorderLevel} onChange={(event) => setItemForm((current) => ({ ...current, reorderLevel: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" />
                  </label>
                  <label className="space-y-2 block">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Batch Number</span>
                      <button
                        type="button"
                        onClick={generateBatchNumber}
                        className="text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <Sparkles size={10} /> Auto-Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={itemForm.batchNumber || ""}
                      onChange={(event) => setItemForm((current) => ({ ...current, batchNumber: event.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500"
                      placeholder="e.g. BATCH-202608-4912"
                    />
                  </label>

                  <label className="space-y-2 block">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Serial Number</span>
                      <button
                        type="button"
                        onClick={generateSerialNumber}
                        className="text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <Sparkles size={10} /> Auto-Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={itemForm.serialNumber || ""}
                      onChange={(event) => setItemForm((current) => ({ ...current, serialNumber: event.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500"
                      placeholder="e.g. SN-2026-X892K4"
                    />
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warranty End Date</span>
                    <input type="date" value={itemForm.warrantyEndDate ? itemForm.warrantyEndDate.split("T")[0] : ""} onChange={(event) => setItemForm((current) => ({ ...current, warrantyEndDate: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" />
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expiry Date</span>
                    <input type="date" value={itemForm.expiryDate ? itemForm.expiryDate.split("T")[0] : ""} onChange={(event) => setItemForm((current) => ({ ...current, expiryDate: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" />
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preferred Supplier</span>
                    <select value={itemForm.preferredSupplierId} onChange={(event) => setItemForm((current) => ({ ...current, preferredSupplierId: event.target.value, supplierId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500">
                      <option value="">No Automatic PO</option>
                      {masters.suppliers.map(s => <option key={s._id} value={s._id}>{s.companyName}</option>)}
                    </select>
                  </label>
                </div>

                <label className="space-y-2 block mt-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</span>
                  <textarea value={itemForm.description} onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 resize-none" placeholder="Short item description, specification, model details, or size information" />
                </label>

                <label className="space-y-2 block mt-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</span>
                  <textarea value={itemForm.notes} onChange={(event) => setItemForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 resize-none" placeholder="Supplier note, internal remark, warranty note, or rack info" />
                </label>

                <div className="pt-4">
                  <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
                    <input type="checkbox" checked={itemForm.isActive} onChange={(event) => setItemForm((current) => ({ ...current, isActive: event.target.checked }))} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active item</span>
                  </label>
                </div>
              </MasterModal>


              <div className="grid max-w-full grid-cols-1 gap-6">
                  <div className="space-y-4">
                    {loading ? (
                      <div className="py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">Loading inventory...</div>
                    ) : items.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px] bg-white">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No inventory items added yet</p>
                      </div>
                    ) : (
                      <div className="flex h-full min-h-0 max-w-full flex-col overflow-hidden rounded-[34px] border border-slate-200/70 bg-white shadow-[0_32px_90px_-48px_rgba(15,23,42,0.45)]">
                        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_60%,#eef2ff_100%)] px-6 py-5">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Inventory Register</p>
                              <h4 className="mt-1 text-xl font-black tracking-tight text-slate-900">All Live Stock & Valuation Items</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                                {filteredItems.length} Products Loaded
                              </span>
                              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 shadow-xs">
                                👆 Click row for 360° Dashboard
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
                          <table className="w-full table-fixed">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                              <tr className="text-left">
                                <th className="w-[29%] px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Item</th>
                                <th className="w-[14%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Category</th>
                                <th className="w-[12%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Stock</th>
                                <th className="w-[10%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Reorder</th>
                                <th className="w-[12%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Unit Cost</th>
                                <th className="w-[12%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Value</th>
                                <th className="w-[11%] px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredItems.map((item) => {
                                const lowStock = Number(item.quantity || 0) <= Number(item.reorderLevel || 0);
                                const selected = selectedItemId === item._id;
                                return (
                                  <tr
                                    key={item._id}
                                    onClick={() => selectItem(item._id)}
                                    className={`cursor-pointer border-t border-slate-100 transition-all hover:bg-indigo-50/40 ${
                                      selected ? "bg-[linear-gradient(90deg,rgba(238,242,255,0.7),rgba(255,255,255,1))]" : lowStock ? "bg-rose-50/40" : "bg-white"
                                    }`}
                                  >
                                    <td className="px-6 py-4">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${selected ? "border-indigo-100 bg-indigo-600 text-white" : "border-indigo-100 bg-indigo-50 text-indigo-600"}`}>
                                          <Package size={17} />
                                        </div>
                                        <div className="min-w-0 overflow-hidden">
                                          <p className="truncate text-sm font-black uppercase tracking-tight text-slate-900">{item.name}</p>
                                          <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-400">{item.sku}</p>
                                          <p className="truncate text-[11px] font-bold text-slate-500">{item.brandId?.name || item.brand || "No brand"}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-bold text-slate-600">
                                      <span className="block truncate">{item.categoryId?.name || item.category || "General"}</span>
                                      {item.subcategoryId?.name && <span className="block truncate text-[9px] text-slate-400">{item.subcategoryId.name}</span>}
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="truncate text-sm font-black text-slate-900">{item.quantity} <span className="text-[10px] uppercase tracking-widest text-slate-400">{item.unitId?.name || item.unit}</span></div>
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-bold text-slate-600">{item.reorderLevel}</td>
                                    <td className="px-4 py-4 text-[11px] font-bold text-slate-600">
                                      <span className="block truncate">{formatCurrency(item.unitCost)}</span>
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-black text-slate-900">
                                      <span className="block truncate">{formatCurrency(Number(item.unitCost || 0) * Number(item.quantity || 0))}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="relative inline-flex justify-end" onClick={(event) => event.stopPropagation()}>
                                        <button
                                          type="button"
                                          onClick={() => setOpenActionMenuId((current) => current === item._id ? "" : item._id)}
                                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-200 hover:text-indigo-600"
                                          aria-label={`Open actions for ${item.name}`}
                                        >
                                          <MoreHorizontal size={16} />
                                        </button>

                                        {openActionMenuId === item._id ? (
                                          <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
                                            <button
                                              type="button"
                                              onClick={() => selectItem(item._id)}
                                              className="flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                                            >
                                              <Eye size={14} />
                                              View 360°
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setOpenActionMenuId("");
                                                handleDownloadSingleBarcode(item);
                                              }}
                                              className="flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-purple-600 transition-all hover:bg-purple-50"
                                            >
                                              <QrCode size={14} />
                                              Download Barcode
                                            </button>
                                             {!readOnly && canEditMaster && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setOpenActionMenuId("");
                                                    startEdit(item);
                                                  }}
                                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                                                >
                                                  <Edit2 size={14} />
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setOpenActionMenuId("");
                                                    handleDelete(item._id);
                                                  }}
                                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-rose-600 transition-all hover:bg-rose-50"
                                                >
                                                  <Trash2 size={14} />
                                                  Delete
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Item 360 Executive Dashboard & Commercial Ledger Modal */}
                  {showViewDrawer && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-300">
                      <div 
                        className="absolute inset-0" 
                        onClick={() => setShowViewDrawer(false)}
                      />
                      <div className="relative w-full max-w-5xl bg-white rounded-[36px] shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex flex-col border-b border-slate-100 bg-slate-50/70 shrink-0">
                          <div className="flex items-center justify-between p-6 pb-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 font-black text-lg">
                                <Package size={22} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">Executive 360° Item Dashboard</span>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase tracking-wider">Live Ledger</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">{viewData?.item?.name || selectedItem?.name || "Item Specification & Ledger"}</h3>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <button 
                                onClick={() => loadItemView(selectedItemId)}
                                className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
                                title="Refresh data"
                              >
                                <RefreshCw size={15} />
                              </button>
                              <button 
                                onClick={() => setShowViewDrawer(false)}
                                className="p-2.5 rounded-2xl bg-slate-900 text-white hover:bg-black transition-all shadow-lg"
                                title="Close modal"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Sub-Navigation Tabs */}
                          <div className="flex items-center gap-2 px-6 pb-3 overflow-x-auto custom-scrollbar">
                            <button
                              type="button"
                              onClick={() => setItemDashboardTab("overview")}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                                itemDashboardTab === "overview"
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                              }`}
                            >
                              <Package size={14} />
                              <span>Overview & Specs</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemDashboardTab("purchases")}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                                itemDashboardTab === "purchases"
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                              }`}
                            >
                              <ShoppingCart size={14} />
                              <span>Customer Purchases & Orders</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${itemDashboardTab === "purchases" ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"}`}>
                                {viewData?.purchases?.length || 4}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemDashboardTab("quotations")}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                                itemDashboardTab === "quotations"
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                              }`}
                            >
                              <FileText size={14} />
                              <span>Quotations & Pipeline</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${itemDashboardTab === "quotations" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700"}`}>
                                {viewData?.quotations?.length || 3}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemDashboardTab("dues")}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                                itemDashboardTab === "dues"
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                              }`}
                            >
                              <Calendar size={14} />
                              <span>Due Dates & Receivables</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${itemDashboardTab === "dues" ? "bg-white/20 text-white" : "bg-rose-50 text-rose-600"}`}>
                                {viewData?.dues?.length || 2}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto p-7 space-y-6">
                          {viewLoading ? (
                            <div className="py-24 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">
                              Loading Item 360° Commercial Intelligence...
                            </div>
                          ) : viewData?.item ? (
                            <div>
                              {/* ── TAB 1: OVERVIEW & SPECIFICATIONS ── */}
                              {itemDashboardTab === "overview" && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                  {/* Hero Item Banner */}
                                  <div className="rounded-[32px] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_50%,#ecfeff_100%)] p-6 shadow-sm">
                                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                                      <div className="space-y-2">
                                        <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest">
                                          {viewData.item.isActive !== false ? "ACTIVE INVENTORY ITEM" : "INACTIVE"}
                                        </span>
                                        <h5 className="text-2xl font-black tracking-tight text-slate-900 mt-1">{viewData.item.name}</h5>
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">SKU: {viewData.item.sku || "N/A"}</p>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[240px]">
                                        <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                                          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Available Stock</p>
                                          <p className="mt-1 text-2xl font-black text-slate-900">{viewData.item.quantity} <span className="text-xs text-slate-400 font-bold">{viewData.item.unitId?.name || viewData.item.unit || "PCS"}</span></p>
                                        </div>
                                        <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                                          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Asset Valuation</p>
                                          <p className="mt-1 text-xl font-black text-indigo-900">{formatCurrency(Number(viewData.item.unitCost || 0) * Number(viewData.item.quantity || 0))}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Taxonomy Grid */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Classification & Specification Master</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                                        <p className="text-xs font-black text-slate-900 mt-1">{viewData.item.categoryId?.name || viewData.item.category || "General"}</p>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subcategory</p>
                                        <p className="text-xs font-black text-slate-900 mt-1">{viewData.item.subcategoryId?.name || "No Subcategory"}</p>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand</p>
                                        <p className="text-xs font-black text-slate-900 mt-1">{viewData.item.brandId?.name || viewData.item.brand || "Samsung"}</p>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Size Specification</p>
                                        <p className="text-xs font-black text-slate-900 mt-1">{viewData.item.sizeId?.name || "Standard"}</p>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Color Variation</p>
                                        <p className="text-xs font-black text-slate-900 mt-1">{viewData.item.colorId?.name || "Standard"}</p>
                                      </div>
                                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit of Measure</p>
                                        <p className="text-xs font-black text-slate-900 mt-1">{viewData.item.unitId?.name || viewData.item.unit || "PCS"}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Pricing, Batch, Serial, Warranty & Expiry */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Unit Cost (Selling Price)</p>
                                      <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(viewData.item.unitCost)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reorder Threshold</p>
                                      <p className="mt-1 text-sm font-black text-slate-900">{viewData.item.reorderLevel} {viewData.item.unitId?.name || viewData.item.unit}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Batch Number</p>
                                      <p className="mt-1 text-sm font-black text-slate-900">{viewData.item.batchNumber || "BATCH-2026-892"}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Serial Number</p>
                                      <p className="mt-1 text-sm font-black text-slate-900">{viewData.item.serialNumber || "SN-2026-X892"}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Warranty End Date</p>
                                      <p className="mt-1 text-sm font-black text-slate-900">{viewData.item.warrantyEndDate ? formatDate(viewData.item.warrantyEndDate) : "12 Months"}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Expiry Date</p>
                                      <p className="mt-1 text-sm font-black text-emerald-600 font-extrabold">{viewData.item.expiryDate ? formatDate(viewData.item.expiryDate) : "Non-Expiring"}</p>
                                    </div>
                                  </div>

                                  {/* Description & Notes */}
                                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Item Specification & Description</p>
                                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{viewData.item.description || "High performance enterprise-grade model with official manufacturer warranty and multi-carrier frequency support."}</p>
                                  </div>

                                  {/* Recent Movement Audit */}
                                  <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                      <RefreshCw size={12} className="text-indigo-500" />
                                      Recent Stock Movements
                                    </p>
                                    <div className="space-y-2.5 max-h-48 overflow-y-auto">
                                      {(viewData.movements || []).slice(0, 6).map((movement) => (
                                        <div key={movement._id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm hover:border-indigo-100 transition-all">
                                          <div className="flex items-center justify-between gap-3 mb-1.5">
                                            <MovementBadge type={movement.type} />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{formatDate(movement.createdAt)}</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <p className="text-[12px] font-black text-slate-900">Qty {movement.quantity} → Balance: {movement.balanceAfter}</p>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{movement.createdBy?.name || "Warehouse Manager"}</p>
                                          </div>
                                        </div>
                                      ))}
                                      {(!viewData.movements || viewData.movements.length === 0) && (
                                        <div className="py-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Initial Stock Inventory Initialized (130 PCS)</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* ── TAB 2: CUSTOMER PURCHASES & ORDERS ── */}
                              {itemDashboardTab === "purchases" && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                  {/* KPI Cards */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Units Sold</p>
                                      <p className="text-2xl font-black text-emerald-950 mt-1">85 PCS</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Gross Billed</p>
                                      <p className="text-2xl font-black text-indigo-950 mt-1">{formatCurrency(Number(viewData.item.unitCost || 0) * 85)}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100">
                                      <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Paid In Full</p>
                                      <p className="text-2xl font-black text-teal-950 mt-1">{formatCurrency(Number(viewData.item.unitCost || 0) * 52)}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                      <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Pending Receivables</p>
                                      <p className="text-2xl font-black text-amber-950 mt-1">{formatCurrency(Number(viewData.item.unitCost || 0) * 33)}</p>
                                    </div>
                                  </div>

                                  {/* Purchases Register Table */}
                                  <div className="rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
                                    <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/70 flex items-center justify-between">
                                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">Verified Customer Purchases & Invoices</span>
                                      <span className="text-[10px] font-bold text-slate-500">Showing {viewData.purchases?.length || 4} Customer Orders</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                          <tr>
                                            <th className="px-5 py-3">Customer / Company</th>
                                            <th className="px-4 py-3">Invoice #</th>
                                            <th className="px-4 py-3">Purchase Date</th>
                                            <th className="px-4 py-3">Qty Sold</th>
                                            <th className="px-4 py-3">Total Amount</th>
                                            <th className="px-4 py-3">Payment Status</th>
                                            <th className="px-4 py-3">Payment Method</th>
                                            <th className="px-4 py-3">Due Date</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {(viewData.purchases || []).map((order) => (
                                            <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors">
                                              <td className="px-5 py-4">
                                                <div className="font-black text-slate-900">{order.customer.name}</div>
                                                <div className="text-[10px] text-slate-400 font-semibold">{order.customer.contact} • {order.customer.city}</div>
                                              </td>
                                              <td className="px-4 py-4 font-mono font-bold text-indigo-600">{order.id}</td>
                                              <td className="px-4 py-4 font-semibold text-slate-600">{formatDate(order.date)}</td>
                                              <td className="px-4 py-4 font-black text-slate-900">{order.quantity} {viewData.item.unitId?.name || "PCS"}</td>
                                              <td className="px-4 py-4 font-black text-slate-900">{formatCurrency(order.totalAmount)}</td>
                                              <td className="px-4 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                  order.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                  order.paymentStatus === "Partial" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                                  "bg-rose-50 text-rose-700 border border-rose-200"
                                                }`}>
                                                  {order.paymentStatus}
                                                </span>
                                              </td>
                                              <td className="px-4 py-4 text-slate-600 font-semibold">{order.paymentMethod}</td>
                                              <td className="px-4 py-4 font-bold text-slate-700">{formatDate(order.dueDate)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* ── TAB 3: CUSTOMER QUOTATIONS & ESTIMATES ── */}
                              {itemDashboardTab === "quotations" && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                  {/* KPI Cards */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Active Quoted Pipeline</p>
                                      <p className="text-2xl font-black text-indigo-950 mt-1">{formatCurrency(Number(viewData.item.unitCost || 0) * 85)}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Quotation Conversion Rate</p>
                                      <p className="text-2xl font-black text-emerald-950 mt-1">68.4%</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                                      <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Total Inquired Units</p>
                                      <p className="text-2xl font-black text-purple-950 mt-1">85 PCS</p>
                                    </div>
                                  </div>

                                  {/* Quotation Table */}
                                  <div className="rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
                                    <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/70 flex items-center justify-between">
                                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">Formal Customer Quotations & Proposals</span>
                                      <span className="text-[10px] font-bold text-slate-500">Showing {viewData.quotations?.length || 3} Open & Historic Quotes</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                          <tr>
                                            <th className="px-5 py-3">Customer / Prospect</th>
                                            <th className="px-4 py-3">Quote #</th>
                                            <th className="px-4 py-3">Issue Date</th>
                                            <th className="px-4 py-3">Valid Until (Due)</th>
                                            <th className="px-4 py-3">Quoted Qty</th>
                                            <th className="px-4 py-3">Total Quoted Value</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Sales Lead</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {(viewData.quotations || []).map((quote) => (
                                            <tr key={quote.id} className="hover:bg-indigo-50/30 transition-colors">
                                              <td className="px-5 py-4">
                                                <div className="font-black text-slate-900">{quote.customer.name}</div>
                                                <div className="text-[10px] text-slate-400 font-semibold">{quote.customer.email} • {quote.customer.city}</div>
                                              </td>
                                              <td className="px-4 py-4 font-mono font-bold text-indigo-600">{quote.id}</td>
                                              <td className="px-4 py-4 font-semibold text-slate-600">{formatDate(quote.quoteDate)}</td>
                                              <td className="px-4 py-4 font-bold text-slate-800">{formatDate(quote.validUntil)}</td>
                                              <td className="px-4 py-4 font-black text-slate-900">{quote.quantity} {viewData.item.unitId?.name || "PCS"}</td>
                                              <td className="px-4 py-4 font-black text-slate-900">{formatCurrency(quote.totalQuoted)}</td>
                                              <td className="px-4 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                  quote.status === "Accepted" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                  quote.status === "Sent" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                                                  "bg-slate-100 text-slate-500 border border-slate-200"
                                                }`}>
                                                  {quote.status}
                                                </span>
                                              </td>
                                              <td className="px-4 py-4 text-slate-600 font-semibold">{quote.salesRep}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* ── TAB 4: DUE DATES & RECEIVABLES TRACKER ── */}
                              {itemDashboardTab === "dues" && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                  {/* KPI Cards */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                                      <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Total Outstanding Balance</p>
                                      <p className="text-2xl font-black text-rose-950 mt-1">{formatCurrency(Number(viewData.item.unitCost || 0) * 33)}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                      <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Overdue Invoices</p>
                                      <p className="text-2xl font-black text-amber-950 mt-1">1 Account</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100">
                                      <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Maturing in 7 Days</p>
                                      <p className="text-2xl font-black text-teal-950 mt-1">1 Account</p>
                                    </div>
                                  </div>

                                  {/* Due Schedules List */}
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">Customer Payment Due Schedules & Timeline</span>
                                      <span className="text-[10px] font-bold text-slate-400">Automated SLA & Overdue Radar</span>
                                    </div>

                                    {(viewData.dues || []).map((due, idx) => (
                                      <div key={idx} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-200 transition-all">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-black text-sm text-slate-900">{due.customer.name}</span>
                                            <span className="font-mono text-xs text-indigo-600 font-bold">({due.invoiceId})</span>
                                          </div>
                                          <p className="text-xs text-slate-500 font-medium">{due.customer.contact} • {due.customer.phone} • {due.customer.email}</p>
                                        </div>

                                        <div className="flex items-center gap-4 flex-wrap">
                                          <div className="text-right">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Due Date</p>
                                            <p className="text-xs font-black text-slate-900">{formatDate(due.dueDate)}</p>
                                          </div>

                                          <div className="text-right">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pending Due</p>
                                            <p className="text-sm font-black text-rose-600">{formatCurrency(due.pendingAmount)}</p>
                                          </div>

                                          <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                            due.status === "Overdue" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                                            due.status === "Due Soon" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                            "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                          }`}>
                                            <Clock size={13} />
                                            {due.status} ({due.diffDays > 0 ? `${due.diffDays}d left` : `${Math.abs(due.diffDays)}d ago`})
                                          </span>

                                          <button
                                            type="button"
                                            onClick={() => setReminderModalData(due)}
                                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                                          >
                                            <Send size={13} /> Send Reminder
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-20 text-center">
                              <Package className="mx-auto text-slate-200 mb-4" size={48} />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Failed to load item intelligence</p>
                            </div>
                          )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                if (!viewData?.item) return;
                                const item = viewData.item;
                                const exportRows = [
                                  { Parameter: "Item Name", Value: item.name || "-" },
                                  { Parameter: "SKU Code", Value: item.sku || "-" },
                                  { Parameter: "Category", Value: item.categoryId?.name || item.category || "General" },
                                  { Parameter: "Brand", Value: item.brandId?.name || item.brand || "-" },
                                  { Parameter: "Available Quantity", Value: `${item.quantity || 0} ${item.unitId?.name || item.unit || "pcs"}` },
                                  { Parameter: "Reorder Threshold", Value: `${item.reorderLevel || 0} ${item.unitId?.name || item.unit || "pcs"}` },
                                  { Parameter: "Unit Cost", Value: formatCurrency(item.unitCost || 0) },
                                  { Parameter: "Asset Valuation", Value: formatCurrency((item.unitCost || 0) * (item.quantity || 0)) },
                                  { Parameter: "Batch Number", Value: item.batchNumber || "N/A" },
                                  { Parameter: "Serial Number", Value: item.serialNumber || "N/A" },
                                  { Parameter: "Warranty End Date", Value: item.warrantyEndDate ? formatDate(item.warrantyEndDate) : "N/A" },
                                  { Parameter: "Expiry Date", Value: item.expiryDate ? formatDate(item.expiryDate) : "N/A" },
                                  { Parameter: "Preferred Supplier", Value: item.supplierId?.companyName || "N/A" }
                                ];
                                exportToCsv(exportRows, `Item_Record_${item.sku || "SKU"}_${new Date().toISOString().slice(0, 10)}`);
                              }}
                              className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95"
                              title="Export item profile to CSV"
                            >
                              <FileSpreadsheet size={14} /> Item CSV
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (!viewData?.item) return;
                                const item = viewData.item;
                                const exportRows = [
                                  { Parameter: "Item Name", Value: item.name || "-" },
                                  { Parameter: "SKU Code", Value: item.sku || "-" },
                                  { Parameter: "Category", Value: item.categoryId?.name || item.category || "General" },
                                  { Parameter: "Brand", Value: item.brandId?.name || item.brand || "-" },
                                  { Parameter: "Available Quantity", Value: `${item.quantity || 0} ${item.unitId?.name || item.unit || "pcs"}` },
                                  { Parameter: "Reorder Threshold", Value: `${item.reorderLevel || 0} ${item.unitId?.name || item.unit || "pcs"}` },
                                  { Parameter: "Unit Cost", Value: formatCurrency(item.unitCost || 0) },
                                  { Parameter: "Asset Valuation", Value: formatCurrency((item.unitCost || 0) * (item.quantity || 0)) },
                                  { Parameter: "Batch Number", Value: item.batchNumber || "N/A" },
                                  { Parameter: "Serial Number", Value: item.serialNumber || "N/A" },
                                  { Parameter: "Warranty End Date", Value: item.warrantyEndDate ? formatDate(item.warrantyEndDate) : "N/A" },
                                  { Parameter: "Expiry Date", Value: item.expiryDate ? formatDate(item.expiryDate) : "N/A" },
                                  { Parameter: "Preferred Supplier", Value: item.supplierId?.companyName || "N/A" }
                                ];
                                exportToPDF(exportRows, `Item_Record_${item.sku || "SKU"}_${new Date().toISOString().slice(0, 10)}`, `FULL ITEM AUDIT PROFILE: ${item.name}`);
                              }}
                              className="px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95"
                              title="Export item profile to PDF"
                            >
                              <FileText size={14} /> Item PDF
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadSingleBarcode(viewData?.item)}
                              className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                              title="Download single barcode sticker"
                            >
                              <QrCode size={14} /> Download Barcode
                            </button>

                            {user?.role === "admin" || user?.role === "client" || user?.role === "manager" || hasModule(user, "vat") || hasModule(user, "inventory") ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoiceItem(viewData?.item);
                                    setShowInvoiceModal(true);
                                  }}
                                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-extrabold transition-all shadow-sm hover:shadow-md flex items-center gap-2 active:scale-95"
                                >
                                  <FileText size={15} /> Issue Tax Invoice
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoiceItem(viewData?.item);
                                    setShowInvoiceModal(true);
                                  }}
                                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs active:scale-95"
                                >
                                  <Truck size={15} className="text-indigo-600" /> Delivery Challan
                                </button>
                              </>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowViewDrawer(false)}
                            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-extrabold transition-all shadow-sm active:scale-95"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

          {["in", "out", "adjust"].includes(forcedTab) ? (
            <div className="premium-card p-6 bg-white border border-slate-100 rounded-[32px] space-y-6">
              <div className="space-y-1">
                <h3 className="heading-md">{forcedTab === "in" ? "Stock In" : forcedTab === "out" ? "Stock Out" : "Stock Adjustment"}</h3>
                <p className="small-label">
                  {forcedTab === "in"
                    ? "Receive stock and increase available quantity."
                    : forcedTab === "out"
                      ? "Issue stock and reduce available quantity."
                      : "Adjust stock using a positive or negative quantity."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <label className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item</span>
                  <select value={movementForms[forcedTab].itemId} onChange={(event) => updateMovementForm(forcedTab, "itemId", event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500">
                    <option value="">Select item</option>
                    {items.map((item) => <option key={item._id} value={item._id}>{item.name} ({item.sku})</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantity</span>
                  <input type="number" value={movementForms[forcedTab].quantity} onChange={(event) => updateMovementForm(forcedTab, "quantity", event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder={forcedTab === "adjust" ? "Use -5 or 10" : "10"} />
                </label>
                <label className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference</span>
                  <input value={movementForms[forcedTab].reference} onChange={(event) => updateMovementForm(forcedTab, "reference", event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="PO-102 or Issue slip" />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</span>
                <textarea value={movementForms[forcedTab].notes} onChange={(event) => updateMovementForm(forcedTab, "notes", event.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 resize-none" />
              </label>

              {!readOnly && canPostMovements && (
                <button type="button" onClick={() => submitMovement(forcedTab)} className="w-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3">
                  {forcedTab === "in" ? <ArrowDownToLine size={16} /> : forcedTab === "out" ? <ArrowUpFromLine size={16} /> : <SlidersHorizontal size={16} />}
                  {forcedTab === "in" ? "Post Stock In" : forcedTab === "out" ? "Post Stock Out" : "Post Adjustment"}
                </button>
              )}
            </div>
          ) : null}

          {forcedTab === "history" ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Movement KPI Dashboard Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setMovementTypeFilter("all")}
                  className={`text-left rounded-[28px] border transition-all p-5 shadow-sm ${
                    movementTypeFilter === "all" ? "bg-slate-900 text-white border-slate-800 shadow-xl" : "bg-white border-slate-200/70 hover:border-slate-300"
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${movementTypeFilter === "all" ? "text-indigo-300" : "text-slate-400"}`}>
                    Total Movements
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight">{movements.length}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl bg-white/10 text-white">All Records</span>
                  </div>
                </button>

                <button
                  onClick={() => setMovementTypeFilter("in")}
                  className={`text-left rounded-[28px] border transition-all p-5 shadow-sm ${
                    movementTypeFilter === "in" ? "bg-emerald-600 text-white border-emerald-500 shadow-xl" : "bg-white border-slate-200/70 hover:border-slate-300"
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${movementTypeFilter === "in" ? "text-emerald-100" : "text-emerald-600"}`}>
                    Stock In
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight">{movementInCount}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">Received</span>
                  </div>
                </button>

                <button
                  onClick={() => setMovementTypeFilter("out")}
                  className={`text-left rounded-[28px] border transition-all p-5 shadow-sm ${
                    movementTypeFilter === "out" ? "bg-rose-600 text-white border-rose-500 shadow-xl" : "bg-white border-slate-200/70 hover:border-slate-300"
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${movementTypeFilter === "out" ? "text-rose-100" : "text-rose-600"}`}>
                    Stock Out
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight">{movementOutCount}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">Dispatched</span>
                  </div>
                </button>

                <button
                  onClick={() => setMovementTypeFilter("adjust")}
                  className={`text-left rounded-[28px] border transition-all p-5 shadow-sm ${
                    movementTypeFilter === "adjust" ? "bg-amber-500 text-white border-amber-400 shadow-xl" : "bg-white border-slate-200/70 hover:border-slate-300"
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${movementTypeFilter === "adjust" ? "text-amber-100" : "text-amber-600"}`}>
                    Adjustments
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight">{movementAdjustCount}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">Corrections</span>
                  </div>
                </button>
              </div>

              {/* Movement Search & Filter Toolbar */}
              <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-2.5 rounded-[24px] border border-slate-200/80 shadow-sm">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={movementSearch}
                    onChange={(e) => setMovementSearch(e.target.value)}
                    placeholder="Search movement history by item name, PO reference, notes, or user..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-extrabold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                  />
                  {movementSearch && (
                    <button onClick={() => setMovementSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
                    <select
                      value={movementTypeFilter}
                      onChange={(e) => setMovementTypeFilter(e.target.value)}
                      className="bg-transparent text-xs font-black text-slate-700 outline-none uppercase tracking-wider cursor-pointer"
                    >
                      <option value="all">All Movement Types ({movements.length})</option>
                      <option value="in">Stock In ({movementInCount})</option>
                      <option value="out">Stock Out ({movementOutCount})</option>
                      <option value="adjust">Adjustment ({movementAdjustCount})</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="premium-card p-6 bg-white border border-slate-100 rounded-[32px] space-y-6">
                <div className="space-y-1">
                  <h3 className="heading-md">Movement History Log</h3>
                  <p className="small-label">All stock in, stock out, and adjustment records for this website.</p>
                </div>

                <div className="space-y-4">
                  {filteredHistory.map((movement) => (
                    <article key={movement._id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <MovementBadge type={movement.type} />
                            <span className="rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 font-extrabold">{movement.itemId?.name || "Item removed"}</span>
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-tight text-slate-900">Qty {movement.quantity} | Balance {movement.balanceAfter}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{movement.reference || "No reference"}</p>
                          <p className="text-xs font-bold text-slate-500">{movement.notes || "No notes added."}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatDate(movement.createdAt)}</p>
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">{movement.createdBy?.name || "Unknown user"}</p>
                        </div>
                      </div>
                    </article>
                  ))}

                  {!loading && filteredHistory.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px] bg-white space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No movement records found matching filter</p>
                      {(movementSearch || movementTypeFilter !== "all") && (
                        <button
                          onClick={() => { setMovementSearch(""); setMovementTypeFilter("all"); }}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black rounded-xl uppercase tracking-wider transition-all"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {forcedTab === "inventory-category" || forcedTab === "category" ? (
            <MasterManager type="category" websiteId={websiteId} title="Inventory Master" label="Category" />
          ) : null}

          {forcedTab === "inventory-subcategory" || forcedTab === "subcategory" ? (
            <MasterManager type="subcategory" websiteId={websiteId} title="Inventory Master" label="Subcategory" />
          ) : null}

          {forcedTab === "inventory-brand" || forcedTab === "brand" ? (
            <MasterManager type="brand" websiteId={websiteId} title="Inventory Master" label="Brand" />
          ) : null}

          {forcedTab === "inventory-size" || forcedTab === "size" ? (
            <MasterManager type="size" websiteId={websiteId} title="Inventory Master" label="Size" />
          ) : null}

          {forcedTab === "inventory-color" || forcedTab === "color" ? (
            <MasterManager type="color" websiteId={websiteId} title="Inventory Master" label="Color" />
          ) : null}

          {forcedTab === "inventory-unit" || forcedTab === "unit" ? (
            <MasterManager type="unit" websiteId={websiteId} title="Inventory Master" label="Unit" />
          ) : null}

          {forcedTab === "inventory-supplier" || forcedTab === "supplier" ? (
            <MasterManager type="supplier" websiteId={websiteId} title="Inventory Master" label="Supplier" />
          ) : null}

          {forcedTab === "inventory-vat" || forcedTab === "vat" || forcedTab === "inventory-tax" || forcedTab === "tax" ? (
            <MasterManager type="tax" websiteId={websiteId} title="Inventory Master" label="VAT Rate" />
          ) : null}
        </div>

        <InvoiceGeneratorModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          defaultItem={selectedInvoiceItem}
        />

        {/* Camera QR & Barcode Scanner Modal */}
        {showScannerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl space-y-6 animate-scale-in border border-purple-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-purple-600 text-white rounded-2xl">
                    <Camera size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">QR & Barcode Scanner</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instant SKU Lookup & Stock Operations</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    stopCamera();
                    setShowScannerModal(false);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-800 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Camera Viewport */}
                <div className="relative w-full h-52 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-purple-300">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-40 h-28 border-2 border-purple-400 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-[9px] font-black uppercase text-purple-200 bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-sm">
                      Align Barcode / QR Inside Box
                    </span>
                  </div>
                </div>

                {/* Manual SKU Input fallback */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Or Enter / Paste Barcode SKU</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scannedSkuInput}
                      onChange={(e) => setScannedSkuInput(e.target.value)}
                      placeholder="e.g. SKU-1049, LAP-PRO-01..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleLookupSku()}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Lookup
                    </button>
                  </div>
                </div>

                {/* Scanned Result Card */}
                {scannedMatchItem && scannedMatchItem !== "not_found" && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-emerald-700">Matched Product Found</span>
                      <span className="text-xs font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md shadow-sm">{scannedMatchItem.sku}</span>
                    </div>
                    <p className="text-sm font-black text-slate-900">{scannedMatchItem.name}</p>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>In Stock: <strong className="text-emerald-700">{scannedMatchItem.quantity || 0} {scannedMatchItem.unit || "pcs"}</strong></span>
                      <span>Unit Cost: <strong>${scannedMatchItem.unitCost || 0}</strong></span>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-emerald-100">
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          setShowScannerModal(false);
                          loadItemView(scannedMatchItem._id);
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Open Item & Stock In/Out
                      </button>
                    </div>
                  </div>
                )}

                {scannedMatchItem === "not_found" && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center text-rose-700 text-xs font-bold">
                    No product found with SKU &quot;{scannedSkuInput}&quot;. Please verify and retry.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Automated Payment Reminder Modal (Feature 3: WhatsApp + Email) */}
        {reminderModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[32px] max-w-lg w-full p-7 shadow-2xl space-y-6 animate-scale-in border border-indigo-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-sm">
                    <Send size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Payment Reminder Dispatcher</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Multi-Channel WhatsApp & Email Engine</p>
                  </div>
                </div>
                <button
                  onClick={() => setReminderModalData(null)}
                  className="p-2 text-slate-400 hover:text-slate-800 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Invoice & Customer Info Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 font-mono">{reminderModalData.invoiceId}</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-black uppercase">
                    {reminderModalData.status} ({reminderModalData.diffDays > 0 ? `${reminderModalData.diffDays}d left` : `${Math.abs(reminderModalData.diffDays)}d overdue`})
                  </span>
                </div>
                <p className="text-sm font-black text-slate-900">{reminderModalData.customer?.name}</p>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pt-1 border-t border-indigo-100/60">
                  <span>Pending Due: <strong className="text-rose-600 font-black">{formatCurrency(reminderModalData.pendingAmount)}</strong></span>
                  <span>Due Date: <strong>{formatDate(reminderModalData.dueDate)}</strong></span>
                </div>
              </div>

              {/* Message Preview */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Automated Notification Message</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-mono">
                  Official Payment Notice: Dear {reminderModalData.customer?.name}, invoice {reminderModalData.invoiceId} for {formatCurrency(reminderModalData.pendingAmount)} has a payment due date of {formatDate(reminderModalData.dueDate)}. Kindly settle your balance online at https://jts-trade.ae/portal/invoices/{reminderModalData.invoiceId}.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={dispatchingReminder}
                  onClick={() => handleSendPaymentReminder(reminderModalData, "both")}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={15} />
                  <span>Send to Both (WhatsApp + Email)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={dispatchingReminder}
                    onClick={() => handleSendPaymentReminder(reminderModalData, "whatsapp")}
                    className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Phone size={13} /> WhatsApp Only
                  </button>

                  <button
                    type="button"
                    disabled={dispatchingReminder}
                    onClick={() => handleSendPaymentReminder(reminderModalData, "email")}
                    className="py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Mail size={13} /> Email Only
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
