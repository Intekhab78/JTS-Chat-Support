import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Lock,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: Bot,
    title: "AI-First Support & Deflection",
    desc: "Resolve routine queries instantly with smart routing and live agent handoff.",
  },
  {
    icon: MessageSquareText,
    title: "Omnichannel Inbox & CRM",
    desc: "Manage chats, tickets, quotations, invoices, and customer 360° in one place.",
  },
  {
    icon: Zap,
    title: "Real-Time SLA & Analytics",
    desc: "Track live visitors, team performance, and compliance deadlines effortlessly.",
  },
];

/**
 * Shared responsive split-screen white authentication layout shell.
 * Eliminates empty left/right desktop whitespace with a light brand/feature showcase panel.
 */
export default function AuthShell({
  badge = "All Systems Operational",
  title,
  subtitle,
  children,
  footer,
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white grid lg:grid-cols-12 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Left Showcase Panel (Desktop) */}
      <aside className="hidden lg:flex lg:col-span-7 flex-col justify-between bg-gradient-to-br from-slate-50 via-indigo-50/45 to-white border-r border-slate-200/80 p-6 xl:p-10 relative overflow-hidden">
        {/* Subtle decorative background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-100/60 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-sky-100/60 blur-3xl" />
        </div>

        {/* Top Brand */}
        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
            title="Back to Landing Page"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1 text-base font-extrabold tracking-tight leading-none">
                <span className="text-slate-900">JTS</span>
                <span className="text-indigo-600">Support</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide">
                Enterprise Command Center
              </span>
            </div>
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-indigo-700 text-[11px] font-semibold border border-indigo-200/70 shadow-2xs">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            v2.0 Platform
          </span>
        </div>

        {/* Middle Value Proposition */}
        <div className="relative z-10 max-w-xl w-full space-y-4 my-auto py-3">
          <div className="space-y-1.5">
            <h2 className="text-xl xl:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Unified Customer Support, CRM &amp; AI Operations.
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Everything your team needs to convert leads, automate support, and manage billing from a single fast workspace.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-2.5">
            {HIGHLIGHTS.map(({ icon: Icon, title: itemTitle, desc }) => (
              <div
                key={itemTitle}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/85 backdrop-blur-sm border border-slate-200/80 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.05)]"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-900">
                    {itemTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-snug">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Compact Trust Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { value: "99.9%", label: "Uptime SLA" },
              { value: "< 2s", label: "AI Response" },
              { value: "2FA", label: "Role Security" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/80 border border-slate-200/75 px-3 py-2 text-center"
              >
                <div className="text-xs xl:text-sm font-extrabold text-slate-900">
                  {stat.value}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Trust Note */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Multi-tenant isolated architecture
          </span>
          <span>JTS Support Suite</span>
        </div>
      </aside>

      {/* Right Auth Form Panel */}
      <main className="lg:col-span-5 flex flex-col items-center bg-white px-4 py-4 sm:px-6 relative overflow-y-auto overflow-x-hidden">
        {/* Subtle dot grid on right side too */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="w-full max-w-[440px] my-auto relative z-10">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.08),0_2px_8px_-2px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-4 sm:p-5 space-y-3">
              {/* Top Back to Home + Status Row */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Home</span>
                  </button>
                  <span className="text-slate-300 lg:hidden">|</span>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="flex items-center gap-1 lg:hidden cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white">
                      <ShieldCheck className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-extrabold tracking-tight text-slate-900">
                      JTS<span className="text-indigo-600">Support</span>
                    </span>
                  </button>
                </div>

                {badge && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {badge}
                  </div>
                )}
              </div>

              {/* Header */}
              <div className="space-y-0.5 text-center">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[11px] text-slate-500 font-medium leading-snug">
                    {subtitle}
                  </p>
                )}
              </div>

              {children}
            </div>
          </div>

          {footer !== null && (
            <div className="mt-2.5 flex flex-col items-center justify-center gap-1 text-[10px] text-slate-400 font-medium text-center">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>{footer || "Enterprise-grade encryption & 2FA security"}</span>
              </div>
              <p className="text-[9.5px] text-slate-400/90">
                Protected by reCAPTCHA •{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">Privacy</a>
                {" & "}
                <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">Terms</a>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
