import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setMessage(res.message || "If an account with that email exists, a password reset link has been sent.");
    } catch (err) {
      setError(err.message || "Failed to process request");
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
        onSubmit={handleSubmit}
        className="w-full max-w-sm sm:max-w-[440px] bg-white rounded-3xl p-6 sm:p-10 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.35)] relative z-10 space-y-6 border border-white/10"
      >
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-black text-slate-950 tracking-tighter leading-none">
            Reset Password.
          </h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Enter your email to receive a reset link
          </p>
        </div>

        {message ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 text-emerald-700 px-5 py-4 rounded-2xl text-xs font-bold border border-emerald-100 leading-relaxed text-center">
              {message}
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full bg-slate-950 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg transition-all"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                className={inputClass}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-[11px] font-bold text-center border border-red-100">
                {error}
              </div>
            )}

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
              ) : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors underline-offset-2 hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
