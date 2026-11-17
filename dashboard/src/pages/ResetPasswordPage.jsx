import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { api } from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
        body: JSON.stringify({ password, confirmPassword }),
      });
      setMessage(
        res.message ||
          "Your password has been reset successfully. You can now log in."
      );
    } catch (err) {
      setError(
        err.message || "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  }

  const labelClass = "block text-[11px] font-semibold text-slate-600 mb-1";
  const inputClass =
    "w-full bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 font-medium hover:border-slate-300 focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400";

  return (
    <AuthShell
      badge="Security Update"
      title="Set New Password"
      subtitle="Choose a strong new password for your account"
    >
      {message ? (
        <div className="space-y-3">
          <div className="bg-emerald-50 text-emerald-800 px-3.5 py-3 rounded-xl text-[11px] font-medium border border-emerald-200/80 leading-relaxed text-center flex flex-col items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all active:scale-[0.99]"
          >
            Sign In Now
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2.5">
            <div>
              <label className={labelClass}>New Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Confirm Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  type={showConfirm ? "text" : "password"}
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl text-[11px] font-semibold text-center border border-rose-200/80">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-white font-semibold text-xs py-2.5 rounded-xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] hover:shadow-[0_12px_24px_-6px_rgba(79,70,229,0.6)] transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-1.5 py-0.5">
                {[0, 0.15, 0.3].map((d, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce"
                    style={{ animationDelay: `${d}s` }}
                  />
                ))}
              </span>
            ) : (
              "Save New Password"
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
