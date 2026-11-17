import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MessageCircle, Send, ExternalLink, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

const COUNTRY_CODES = [
  { code: "91", label: "IN (+91)" },
  { code: "971", label: "UAE (+971)" },
  { code: "1", label: "US/CA (+1)" },
  { code: "44", label: "UK (+44)" },
  { code: "966", label: "SA (+966)" },
  { code: "974", label: "QA (+974)" },
  { code: "968", label: "OM (+968)" },
  { code: "965", label: "KW (+965)" },
  { code: "973", label: "BH (+973)" },
  { code: "65", label: "SG (+65)" },
  { code: "61", label: "AU (+61)" },
  { code: "49", label: "DE (+49)" },
  { code: "33", label: "FR (+33)" },
  { code: "60", label: "MY (+60)" },
  { code: "977", label: "NP (+977)" },
  { code: "880", label: "BD (+880)" },
  { code: "94", label: "LK (+94)" },
  { code: "92", label: "PK (+92)" },
  { code: "62", label: "ID (+62)" },
  { code: "81", label: "JP (+81)" },
];

function splitPhoneAndCode(rawPhone) {
  const digits = String(rawPhone || "").replace(/[^0-9]/g, "").replace(/^00+/, "");
  if (!digits) return { code: "91", local: "" };
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  if (digits.length > 10 || String(rawPhone || "").trim().startsWith("+")) {
    const matched = sorted.find((c) => digits.startsWith(c.code));
    if (matched) {
      return { code: matched.code, local: digits.slice(matched.code.length) };
    }
  }
  return { code: "91", local: digits.replace(/^0+/, "") };
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  title = "Share via WhatsApp",
  subtitle = "",
  initialPhone = "",
  initialMessage = "",
  customerId = null,
  websiteId = null,
}) {
  const toast = useToast();
  const [countryCode, setCountryCode] = useState("91");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [sendingApi, setSendingApi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const parsed = splitPhoneAndCode(initialPhone);
      setCountryCode(parsed.code);
      setPhone(parsed.local);
      setMessage(initialMessage || "");
      setApiError("");
      setCopied(false);
    }
  }, [isOpen, initialPhone, initialMessage]);

  if (!isOpen) return null;

  const rawTrimmed = String(phone || "").trim();
  const localDigits = rawTrimmed.replace(/[^0-9]/g, "").replace(/^0+/, "");
  const cleanPhone = !localDigits
    ? ""
    : rawTrimmed.startsWith("+")
      ? localDigits
      : `${countryCode}${localDigits}`;

  const handleCopy = () => {
    if (!message.trim()) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("WhatsApp message copied!");
    setTimeout(() => setCopied(false), 1800);
  };

  const handleOpenWhatsAppWeb = () => {
    if (!message.trim()) {
      toast.error("Message cannot be empty.");
      return;
    }
    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleSendViaCloudApi = async () => {
    if (!cleanPhone) {
      setApiError("Please enter a valid phone number with country code (e.g. 971501234567).");
      return;
    }
    if (!message.trim()) {
      setApiError("Message cannot be empty.");
      return;
    }
    setSendingApi(true);
    setApiError("");
    try {
      await api("/api/crm/communication/send-whatsapp", {
        method: "POST",
        body: JSON.stringify({
          to: cleanPhone,
          message: message.trim(),
          customerId: customerId || undefined,
          websiteId: websiteId && websiteId !== "all" ? websiteId : undefined,
        }),
      });
      toast.success(`WhatsApp message sent to +${cleanPhone}`);
      onClose();
    } catch (err) {
      setApiError(
        err?.message || "WhatsApp Cloud API is not configured. Use 'Open WhatsApp Web' instead."
      );
    } finally {
      setSendingApi(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-4 shadow-xl space-y-3 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle size={15} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 truncate">{title}</h3>
              {subtitle && (
                <p className="text-[9.5px] font-medium text-slate-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Phone Number */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Recipient WhatsApp Number
            </label>
            {!cleanPhone && (
              <span className="text-[8.5px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                No phone on profile
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                if (apiError) setApiError("");
              }}
              aria-label="Country Code"
              className="w-28 shrink-0 px-2 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (apiError) setApiError("");
              }}
              placeholder="e.g. 6387725553"
              className="flex-1 min-w-0 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Message Preview / Editor */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Message Preview
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none leading-relaxed"
          />
        </div>

        {apiError && (
          <div className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[9.5px] font-semibold text-rose-600">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleSendViaCloudApi}
            disabled={sendingApi}
            className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[9.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {sendingApi ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {sendingApi ? "Sending..." : "Send via API"}
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsAppWeb}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink size={12} /> Open WhatsApp
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

