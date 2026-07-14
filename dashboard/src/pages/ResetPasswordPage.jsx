import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api(`/api/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password, confirmPassword })
      });
      setMessage(res.message || "Your password has been reset successfully. You can now log in.");
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may have expired.");
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
            New Password.
          </h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Choose a strong new password for your account
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
              Sign In Now
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Password</label>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm Password</label>
                <input
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  className={inputClass}
                  required
                />
              </div>
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
              ) : "Save New Password"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
