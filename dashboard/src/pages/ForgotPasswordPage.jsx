import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { api } from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";
import { executeRecaptcha } from "../utils/recaptcha.js";

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
      const captchaToken = await executeRecaptcha("forgot_password").catch(() => "");
      const res = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email, captchaToken: captchaToken || "" }),
      });
      setMessage(
        res.message ||
        "If an account with that email exists, a password reset link has been sent."
      );
    } catch (err) {
      setError(err.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  }

  const labelClass = "block text-[11px] font-semibold text-slate-600 mb-1";
  const inputClass =
    "w-full bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium hover:border-slate-300 focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400";

  return (
    <AuthShell
      badge="Account Recovery"
      title="Reset Password"
      subtitle="Enter your registered email to receive a secure reset link"
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
            Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                type="email"
                className={inputClass}
                required
              />
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
              "Send Reset Link"
            )}
          </button>

          <div className="text-center pt-0.5">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
