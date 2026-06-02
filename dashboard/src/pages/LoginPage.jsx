import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { normalizeRole } from "../utils/roles.js";

function destinationForRole(role) {
  if (String(role || "").trim().toLowerCase() === "purchase") return "/purchase";
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "agent") return "/agent";
  if (normalizedRole === "sales") return "/sales";
  if (normalizedRole === "manager") return "/manager";
  if (normalizedRole === "admin") return "/admin";
  if (normalizedRole === "client") return "/client";
  return "/agent";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = mode === "login"
        ? await login(email, password, twoFactorCode)
        : await register({ name, email, password, role: "client" });

      if (user?.twoFactorRequired) {
        setNeedsTwoFactor(true);
        setError("Enter your 6-digit authenticator code to continue.");
        return;
      }
      navigate(destinationForRole(user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090e1a] p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <form
        onSubmit={submit}
        className="w-full max-w-sm sm:max-w-[440px] bg-white rounded-3xl p-6 sm:p-10 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.35)] relative z-10 space-y-6 border border-white/10"
      >
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-black tracking-widest border border-emerald-500/20 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All Systems Operational
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tighter leading-none">
            {mode === "login" ? "Welcome back." : "Create Account."}
          </h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
            {mode === "login" ? "Access your operational dashboard" : "Initialize a new enterprise instance"}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="p-1 bg-slate-50 rounded-2xl flex gap-1 border border-slate-100">
          {["login", "register"].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200
                ${mode === m ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="small-label">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" className={inputClass} required />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="small-label">Email Address</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email" className={inputClass} required />
          </div>
          <div className="space-y-1.5">
            <label className="small-label">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" className={inputClass} required />
          </div>
          {mode === "login" && needsTwoFactor && (
            <div className="space-y-1.5">
              <label className="small-label">Authenticator Code</label>
              <input
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                className={`${inputClass} tracking-[0.3em] text-center`}
                required
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-[11px] font-bold text-center border border-red-100">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-950 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              {[0, 0.15, 0.3].map((d, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: `${d}s` }} />
              ))}
            </span>
          ) : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        {mode === "login" && (
          <div className="text-center">
            <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors underline-offset-2 hover:underline">
              Forgot your password?
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
