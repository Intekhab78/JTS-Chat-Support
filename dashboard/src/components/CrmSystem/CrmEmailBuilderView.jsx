import React, { useState, useEffect, useRef } from "react";
import { Mail, Edit3, Eye, Plus, Save, Trash2, Send, Variable, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../../api/client.js";

// Basic default template layout to get started
const DEFAULT_PRESET_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f5f7; color: #334155; margin: 0; padding: 20px; }
    .card { background-color: #ffffff; max-width: 600px; margin: 40px auto; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background-color: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
    .body { padding: 40px; line-height: 1.6; }
    .btn { display: inline-block; padding: 12px 30px; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: bold; margin: 20px 0; }
    .footer { font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin:0; font-size: 18px; letter-spacing: 0.1em; text-transform: uppercase;">Custom Notification</h2>
    </div>
    <div class="body">
      <h3>Hello {customerName},</h3>
      <p>Thank you for choosing JTS. Your invoice details are listed below:</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; font-family: monospace;">
        <strong>Invoice:</strong> {invoiceNumber}<br/>
        <strong>Amount Due:</strong> {amount}
      </div>
      <p>Click the button below to view your account dashboard:</p>
      <center>
        <a href="{ctaUrl}" class="btn">{ctaText}</a>
      </center>
      <div class="footer">
        This is a custom automated dispatch. Please do not reply directly.
      </div>
    </div>
  </div>
</body>
</html>`;

export default function CrmEmailBuilderView({ websiteId }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  
  // Form states
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState(DEFAULT_PRESET_HTML);

  // Status logs
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const textareaRef = useRef(null);

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
    setSubject("");
    setHtmlContent(DEFAULT_PRESET_HTML);
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
      setError("");
      setSuccess("");
    }
  };

  // Click handler to inject placeholder tags at current cursor index
  const injectPlaceholder = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const newVal = currentVal.substring(0, start) + `{${tag}}` + currentVal.substring(end);
    setHtmlContent(newVal);
    
    // Maintain cursor focus
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + tag.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !subject || !htmlContent) {
      setError("Please fill in template name, subject, and HTML content.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (selectedTemplateId) {
        // Edit update call
        const res = await api(`/api/crm/emails/templates/${selectedTemplateId}`, {
          method: "PUT",
          body: JSON.stringify({ name, subject, htmlContent })
        });
        setSuccess("Template updated successfully!");
      } else {
        // Create new template call
        const res = await api("/api/crm/emails/templates", {
          method: "POST",
          body: JSON.stringify({ name, subject, htmlContent, websiteId })
        });
        setSuccess("New template saved successfully!");
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
          subject,
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

  // Compile mock values in HTML code preview for live testing view iframe
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
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Design & Persistence Workspace for Corporate Communications</p>
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
        
        {/* Left Panel: Form & Code Editor */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
              <Edit3 size={12} className="text-indigo-500" /> Template Configuration
            </h4>
            {selectedTemplateId && (
              <button
                onClick={handleDelete}
                className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
              >
                <Trash2 size={11} /> Delete
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Template Name (Unique identifier)</label>
              <input 
                type="text"
                placeholder="e.g., Lead Followup Welcome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 focus:bg-white transition-all outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Default Email Subject Line</label>
              <input 
                type="text"
                placeholder="e.g., Welcome to the Command Center {customerName}!"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 focus:bg-white transition-all outline-none"
              />
            </div>
          </div>

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
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm space-y-4 flex flex-col h-[610px]">
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
              sandbox="allow-scripts allow-same-origin"
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
