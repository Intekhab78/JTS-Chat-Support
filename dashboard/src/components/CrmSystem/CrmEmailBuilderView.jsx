import React, { useState, useEffect, useRef } from "react";
import { Mail, Edit3, Eye, Plus, Save, Trash2, Send, Variable, AlertCircle, CheckCircle2, Layout, Code } from "lucide-react";
import { api } from "../../api/client.js";

// Helper function to compile visual form selections into responsive HTML markup
const compileFormToHtml = (formData) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 20px; line-height: 1.6; }
    .card { background-color: #ffffff; max-width: 600px; margin: 40px auto; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
    .header { background: ${formData.headerBgColor || "#4f46e5"}; padding: 30px; text-align: center; color: ${formData.headerTextColor || "#ffffff"}; }
    .body { padding: 40px; }
    .btn-wrapper { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; padding: 14px 30px; background: ${formData.btnBgColor || "#4f46e5"}; color: #ffffff !important; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.2); }
    .highlight-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0; }
    .footer { font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin:0; font-size: 20px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">${formData.headerTitle || "Notification"}</h2>
      ${formData.headerSubtitle ? `<p style="margin:4px 0 0; font-size:10px; font-weight:700; letter-spacing:0.2em; opacity:0.8; text-transform:uppercase;">${formData.headerSubtitle}</p>` : ""}
    </div>
    <div class="body">
      ${formData.greetingType !== "none" ? `<h3 style="margin-top:0; font-size:16px; font-weight:700; color:#0f172a;">${formData.greetingType === "dear" ? "Dear" : "Hi"} {customerName},</h3>` : ""}
      
      <div style="font-size:14px; color:#475569; margin-bottom:20px;">
        ${(formData.bodyContent || "Thank you for choosing us.").split('\n').map(p => p.trim() ? `<p style="margin:0 0 16px;">${p}</p>` : "").join('')}
      </div>

      ${formData.enableHighlight ? `
        <div class="highlight-card">
          <p style="margin:0 0 8px; font-size:10px; font-weight:800; text-transform:uppercase; color:#64748b; letter-spacing:0.05em;">${formData.highlightTitle || "Details"}</p>
          <div style="font-family: monospace; font-size:12px; color:#334155; line-height:1.7;">
            ${(formData.highlightRows || "").split('\n').map(r => r.trim() ? `<div>${r}</div>` : "").join('')}
          </div>
        </div>
      ` : ""}

      ${formData.enableCta ? `
        <div class="btn-wrapper">
          <a href="${formData.ctaUrl || "{ctaUrl}"}" class="btn" target="_blank">${formData.ctaText || "View Portal"}</a>
        </div>
      ` : ""}

      <div class="footer">
        ${formData.footerDisclaimer || "This is an automated delivery. Please do not reply."}<br>
        &copy; ${new Date().getFullYear()} ${formData.footerCopyright || "JTS Support"}. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`;
};

export default function CrmEmailBuilderView({ websiteId }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  
  // Editor mode switcher: "visual" (form inputs, no code) vs "code" (raw html textarea)
  const [editorMode, setEditorMode] = useState("visual");

  // Visual Form designer states
  const [headerTitle, setHeaderTitle] = useState("JTS Command Center");
  const [headerSubtitle, setHeaderSubtitle] = useState("Enterprise CRM Ecosystem");
  const [headerBgColor, setHeaderBgColor] = useState("#4f46e5");
  const [headerTextColor, setHeaderTextColor] = useState("#ffffff");
  
  const [greetingType, setGreetingType] = useState("hi");
  const [bodyContent, setBodyContent] = useState("Thank you for your recent inquiry.\nWe have registered your details in our system and our team will get in touch with you shortly.");
  
  const [enableHighlight, setEnableHighlight] = useState(true);
  const [highlightTitle, setHighlightTitle] = useState("Invoice Details");
  const [highlightRows, setHighlightRows] = useState("Invoice Number: {invoiceNumber}\nAmount Due: {amount}");
  
  const [enableCta, setEnableCta] = useState(true);
  const [ctaText, setCtaText] = useState("View Account Portal");
  const [ctaUrl, setCtaUrl] = useState("{ctaUrl}");
  const [btnBgColor, setBtnBgColor] = useState("#4f46e5");
  
  const [footerDisclaimer, setFooterDisclaimer] = useState("This is an automated notification. Please do not reply directly.");
  const [footerCopyright, setFooterCopyright] = useState("JTS Chat Support");

  // Stored compiled code
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");

  // Status logs
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const textareaRef = useRef(null);

  // Sync visual form selections to htmlContent on modification
  useEffect(() => {
    if (editorMode === "visual") {
      const compiled = compileFormToHtml({
        headerTitle,
        headerSubtitle,
        headerBgColor,
        headerTextColor,
        greetingType,
        bodyContent,
        enableHighlight,
        highlightTitle,
        highlightRows,
        enableCta,
        ctaText,
        ctaUrl,
        btnBgColor,
        footerDisclaimer,
        footerCopyright
      });
      setHtmlContent(compiled);
    }
  }, [
    editorMode, headerTitle, headerSubtitle, headerBgColor, headerTextColor,
    greetingType, bodyContent, enableHighlight, highlightTitle, highlightRows,
    enableCta, ctaText, ctaUrl, btnBgColor, footerDisclaimer, footerCopyright
  ]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api(`/api/crm/emails/templates?websiteId=${websiteId}`);
      setTemplates(res || []);
    } catch (err) {
      setError(err.message || "Failed to load custom templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteId) {
      fetchTemplates();
      resetForm();
    }
  }, [websiteId]);

  const resetForm = () => {
    setSelectedTemplateId("");
    setName("");
    setSubject("Notification Update");
    setEditorMode("visual");
    
    // Reset visual builder values
    setHeaderTitle("JTS Command Center");
    setHeaderSubtitle("Enterprise CRM Ecosystem");
    setHeaderBgColor("#4f46e5");
    setHeaderTextColor("#ffffff");
    setGreetingType("hi");
    setBodyContent("Thank you for your recent inquiry.\nWe have registered your details in our system.");
    setEnableHighlight(true);
    setHighlightTitle("Invoice Details");
    setHighlightRows("Invoice Number: {invoiceNumber}\nAmount Due: {amount}");
    setEnableCta(true);
    setCtaText("View Account Portal");
    setCtaUrl("{ctaUrl}");
    setBtnBgColor("#4f46e5");
    setFooterDisclaimer("This is an automated notification. Please do not reply directly.");
    setFooterCopyright("JTS Chat Support");
    
    setError("");
    setSuccess("");
  };

  const handleSelectTemplate = (id) => {
    if (!id) {
      resetForm();
      return;
    }
    const template = templates.find(t => t._id === id);
    if (template) {
      setSelectedTemplateId(template._id);
      setName(template.name);
      setSubject(template.subject);
      setHtmlContent(template.htmlContent);
      setEditorMode("code"); // Default to code editor for loaded custom HTML templates
      setError("");
      setSuccess("");
    }
  };

  const injectPlaceholder = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const newVal = currentVal.substring(0, start) + `{${tag}}` + currentVal.substring(end);
    setHtmlContent(newVal);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + tag.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !subject || !htmlContent) {
      setError("Please provide template name, subject line, and content.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (selectedTemplateId) {
        await api(`/api/crm/emails/templates/${selectedTemplateId}`, {
          method: "PUT",
          body: JSON.stringify({ name, subject, htmlContent })
        });
        setSuccess("Template updated successfully!");
      } else {
        const res = await api("/api/crm/emails/templates", {
          method: "POST",
          body: JSON.stringify({ name, subject, htmlContent, websiteId })
        });
        setSuccess("New visual template saved to database!");
        setSelectedTemplateId(res.template?._id || "");
      }
      await fetchTemplates();
    } catch (err) {
      setError(err.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) return;
    if (!window.confirm("Are you sure you want to delete this custom template?")) return;

    setError("");
    setSuccess("");
    try {
      await api(`/api/crm/emails/templates/${selectedTemplateId}`, {
        method: "DELETE"
      });
      setSuccess("Template deleted successfully!");
      resetForm();
      await fetchTemplates();
    } catch (err) {
      setError(err.message || "Failed to delete template.");
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      setError("Please input a valid test destination email address.");
      return;
    }

    setSendingTest(true);
    setError("");
    setSuccess("");

    try {
      await api("/api/crm/emails/templates/test", {
        method: "POST",
        body: JSON.stringify({
          targetEmail: testEmail,
          subject: subject || "Notification Update",
          htmlContent
        })
      });
      setSuccess(`Test email sent to ${testEmail}! Check your inbox.`);
    } catch (err) {
      setError(err.message || "Failed to dispatch test email.");
    } finally {
      setSendingTest(false);
    }
  };

  const compilePreview = () => {
    return htmlContent
      .replace(/{customerName}/g, "Johnathan Doe (Test Client)")
      .replace(/{ctaText}/g, "ACTIVATE LIVE DASHBOARD")
      .replace(/{ctaUrl}/g, "https://chat.jtsmiddleeast.com")
      .replace(/{invoiceNumber}/g, "INV-2026-9999")
      .replace(/{amount}/g, "$2,500.00 USD");
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b pb-3 border-slate-200">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Mail size={14} className="text-indigo-500" /> Visual Email Template Builder
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Design customized emails using form fields without writing code</p>
        </div>
        
        {/* Template Selector dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-black uppercase text-slate-700 outline-none"
          >
            <option value="">-- [Create New Template] --</option>
            {templates.map(t => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
          {selectedTemplateId && (
            <button
              onClick={resetForm}
              className="p-2 border rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"
            >
              New Preset
            </button>
          )}
        </div>
      </div>

      {/* Operation Logs alert */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-600 font-bold flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-600 font-bold flex items-center gap-2">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Split workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        
        {/* Left Panel: Form UI Designer vs Code Editor */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            {/* Editor mode toggler */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditorMode("visual")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                  editorMode === "visual"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <Layout size={10} /> Visual Form Builder
              </button>
              <button
                type="button"
                onClick={() => setEditorMode("code")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                  editorMode === "code"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <Code size={10} /> HTML Code Editor
              </button>
            </div>

            {selectedTemplateId && (
              <button
                onClick={handleDelete}
                className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
              >
                <Trash2 size={11} /> Delete
              </button>
            )}
          </div>

          {/* Template Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Template Title / Name</label>
              <input 
                type="text"
                placeholder="e.g., Lead Followup Welcome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 focus:bg-white transition-all outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Email Subject Line</label>
              <input 
                type="text"
                placeholder="e.g., Welcome to the Command Center {customerName}!"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 focus:bg-white transition-all outline-none"
              />
            </div>
          </div>

          {/* Mode branch */}
          {editorMode === "visual" ? (
            <div className="space-y-4 pt-2">
              {/* Header Settings Section */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-b pb-1 border-slate-100">1. Header Branding & Banner</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Header Title Text</label>
                    <input 
                      type="text"
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Header Subtitle</label>
                    <input 
                      type="text"
                      value={headerSubtitle}
                      onChange={(e) => setHeaderSubtitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Header Background Color</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color"
                        value={headerBgColor}
                        onChange={(e) => setHeaderBgColor(e.target.value)}
                        className="w-8 h-8 rounded border p-0.5 cursor-pointer bg-white"
                      />
                      <input 
                        type="text"
                        value={headerBgColor}
                        onChange={(e) => setHeaderBgColor(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Header Text Color</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color"
                        value={headerTextColor}
                        onChange={(e) => setHeaderTextColor(e.target.value)}
                        className="w-8 h-8 rounded border p-0.5 cursor-pointer bg-white"
                      />
                      <input 
                        type="text"
                        value={headerTextColor}
                        onChange={(e) => setHeaderTextColor(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Greeting & Body content */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-b pb-1 border-slate-100">2. Body Greeting & Paragraphs</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Greeting Format</label>
                    <div className="flex gap-4 text-xs font-bold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input type="radio" name="greeting" checked={greetingType === "hi"} onChange={() => setGreetingType("hi")} /> Hi customerName,
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input type="radio" name="greeting" checked={greetingType === "dear"} onChange={() => setGreetingType("dear")} /> Dear customerName,
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input type="radio" name="greeting" checked={greetingType === "none"} onChange={() => setGreetingType("none")} /> None (Skip greeting)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Message Content Paragraphs</label>
                    <textarea 
                      rows={5}
                      value={bodyContent}
                      onChange={(e) => setBodyContent(e.target.value)}
                      placeholder="Write your email body here. Supports standard dynamic tags."
                      className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Highlight Details box */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center border-b pb-1 border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">3. Highlight Info Card</p>
                  <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider cursor-pointer text-indigo-600">
                    <input 
                      type="checkbox" 
                      checked={enableHighlight} 
                      onChange={(e) => setEnableHighlight(e.target.checked)} 
                    /> Enable Card
                  </label>
                </div>
                
                {enableHighlight && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Highlight Box Title</label>
                      <input 
                        type="text"
                        value={highlightTitle}
                        onChange={(e) => setHighlightTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Key-Value Rows (One per line)</label>
                      <textarea 
                        rows={2}
                        value={highlightRows}
                        onChange={(e) => setHighlightRows(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-mono font-bold leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CTA Button settings */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center border-b pb-1 border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">4. Call-To-Action (CTA) Button</p>
                  <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider cursor-pointer text-indigo-600">
                    <input 
                      type="checkbox" 
                      checked={enableCta} 
                      onChange={(e) => setEnableCta(e.target.checked)} 
                    /> Enable CTA
                  </label>
                </div>
                
                {enableCta && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Button Label Text</label>
                      <input 
                        type="text"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Button Hyperlink Target</label>
                      <input 
                        type="text"
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Button Accent Color</label>
                      <div className="flex gap-2 items-center">
                        <input 
                          type="color"
                          value={btnBgColor}
                          onChange={(e) => setBtnBgColor(e.target.value)}
                          className="w-8 h-8 rounded border p-0.5 cursor-pointer bg-white"
                        />
                        <input 
                          type="text"
                          value={btnBgColor}
                          onChange={(e) => setBtnBgColor(e.target.value)}
                          className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer info settings */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-b pb-1 border-slate-100">5. Footer Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Disclaimer Notice Text</label>
                    <input 
                      type="text"
                      value={footerDisclaimer}
                      onChange={(e) => setFooterDisclaimer(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Copyright Owner Name</label>
                    <input 
                      type="text"
                      value={footerCopyright}
                      onChange={(e) => setFooterCopyright(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
              {/* Placeholders Toolbar */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Variable size={10} className="text-indigo-500" /> Insert Merge Tags (Placeholders)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["customerName", "ctaText", "ctaUrl", "invoiceNumber", "amount"].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => injectPlaceholder(tag)}
                      className="px-2.5 py-1 text-[9px] font-mono font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg border border-slate-200/50 transition-colors"
                    >
                      {`{${tag}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* HTML Source code block */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">HTML layout code</label>
                <textarea
                  ref={textareaRef}
                  rows={15}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full font-mono bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Bottom Save Trigger */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-100"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={12} /> Save Template Design
              </>
            )}
          </button>
        </div>

        {/* Right Panel: Live Render IFrame Sandbox */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm space-y-4 flex flex-col h-[610px] sticky top-4">
          <div className="flex justify-between items-center pb-2 border-b shrink-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
              <Eye size={12} className="text-indigo-500" /> Real-time Sandbox Preview
            </h4>
            <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">Live rendering active</span>
          </div>

          {/* Sandboxed iframe preview */}
          <div className="flex-1 bg-slate-50 border rounded-2xl overflow-hidden relative min-h-[300px]">
            <iframe
              srcDoc={compilePreview()}
              title="Template Render Sandbox"
              className="w-full h-full border-none bg-white"
            />
          </div>

          {/* Test Run Email box */}
          <div className="bg-slate-50 rounded-2xl border p-4 shrink-0 space-y-3">
            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Send size={10} className="text-indigo-500" /> Run Live Test Dispatch
            </h5>
            <div className="flex gap-2">
              <input 
                type="email"
                placeholder="Enter test destination address..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none"
              />
              <button
                onClick={handleSendTest}
                disabled={sendingTest}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 text-[10px] font-black uppercase flex items-center justify-center gap-1 tracking-wider transition-colors disabled:opacity-40"
              >
                {sendingTest ? (
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={10} /> Test Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
