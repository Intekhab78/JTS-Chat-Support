import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Lock, Mail, User } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { normalizeRole } from "../utils/roles.js";
import AuthShell from "../components/AuthShell.jsx";
import { executeRecaptcha } from "../utils/recaptcha.js";

const SHORT_PLAN_LABELS = {
  free: "Free",
  basic: "Basic",
  standard: "Standard",
  pro: "Pro",
  enterprise: "Enterprise",
};

function getPasswordStrength(value) {
  if (!value) return { score: 0, label: "", barClass: "", textClass: "" };
  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 8 && /[A-Za-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  else if (value.length >= 10 && /[0-9]/.test(value)) score += 1;

  if (score <= 1) {
    return { score: 1, label: "Weak", barClass: "bg-rose-500", textClass: "text-rose-600" };
  }
  if (score === 2) {
    return { score: 2, label: "Fair", barClass: "bg-amber-500", textClass: "text-amber-600" };
  }
  return { score: 3, label: "Strong", barClass: "bg-emerald-500", textClass: "text-emerald-600" };
}

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
  const [searchParams] = useSearchParams();
  const urlPlan = searchParams.get("plan")?.toLowerCase().trim() || "";
  const urlMode = searchParams.get("mode");

  const initialMode = urlMode === "register" ? "register" : "login";

  const [mode, setMode] = useState(initialMode);
  const [planOptions, setPlanOptions] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(urlPlan || "free");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = mode === "register" ? getPasswordStrength(password) : null;
  const activeUrlPlan = planOptions.find((p) => p.id === urlPlan);
  const currentPlanOption = planOptions.find((p) => p.id === selectedPlan) || planOptions[0];

  useEffect(() => {
    let cancelled = false;
    setPlansLoading(true);
    api("/api/subscription-plans")
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data
          .filter((p) => p?.isActive !== false)
          .map((p) => {
            const code = String(p.code || "").toLowerCase().trim();
            const symbol = p.currencySymbol || "$";
            return {
              id: code,
              name: SHORT_PLAN_LABELS[code] || p.name,
              fullName: p.name,
              price: `${symbol}${p.monthlyPrice}/mo`,
              limits: {
                agents: p.limits?.agents ?? 1,
                websites: p.limits?.websites ?? 1,
              },
            };
          });
        setPlanOptions(mapped);
        if (mapped.length > 0) {
          const preferred = urlPlan && mapped.some((p) => p.id === urlPlan)
            ? urlPlan
            : mapped.some((p) => p.id === selectedPlan)
            ? selectedPlan
            : mapped[0].id;
          setSelectedPlan(preferred);
        }
      })
      .catch(() => {
        if (!cancelled) setPlanOptions([]);
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const cleanEmail = email.trim();
    const cleanName = name.trim();

    try {
      const captchaToken = !needsTwoFactor
        ? await executeRecaptcha(mode === "login" ? "login" : "register").catch(() => "")
        : "";

      const user = mode === "login"
        ? await login(cleanEmail, password, twoFactorCode, captchaToken || "")
        : await register({
            name: cleanName,
            email: cleanEmail,
            password,
            role: "client",
            plan: selectedPlan,
            captchaToken: captchaToken || "",
          });

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

  const labelClass = "block text-[11px] font-semibold text-slate-600 mb-1";
  const inputClass =
    "w-full bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium hover:border-slate-300 focus:ring-3 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400";

  return (
    <AuthShell
      title={mode === "login" ? "Welcome back" : "Create your account"}
      subtitle={
        mode === "login"
          ? "Sign in to access your operational dashboard"
          : "Initialize a new enterprise support instance"
      }
    >
      <form onSubmit={submit} className="space-y-3">
        {/* Compact Mode toggle */}
        <div className="p-0.5 bg-slate-100 rounded-xl flex gap-1 border border-slate-200/70">
          {["login", "register"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`flex-1 py-1.5 rounded-[10px] text-[11px] font-semibold tracking-wide transition-all duration-200
                ${
                  mode === m
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-800"
                }`}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Selected Plan Banner for URL select */}
        {mode === "register" && urlPlan && activeUrlPlan && (
          <div
            className={`px-3 py-2 rounded-xl flex items-center justify-between border text-[11px] font-semibold
              ${
                urlPlan === "pro"
                  ? "bg-indigo-50/80 border-indigo-200 text-indigo-700"
                  : urlPlan === "standard"
                  ? "bg-amber-50/80 border-amber-200 text-amber-700"
                  : "bg-sky-50/80 border-sky-200 text-sky-700"
              }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>{activeUrlPlan.fullName || activeUrlPlan.name}</span>
            </div>
            <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-md border border-black/5">
              {activeUrlPlan.price}
            </span>
          </div>
        )}

        {/* Fields */}
        <div className="space-y-2.5">
          {mode === "register" && (
            <div>
              <label className={labelClass}>Full Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className={inputClass}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                type="email"
                autoComplete="email"
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-600">Password</label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "register" ? 6 : undefined}
                className={`${inputClass} pr-9`}
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

            {mode === "register" && (
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex-1 grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((step) => (
                    <span
                      key={step}
                      className={`h-1 rounded-full transition-colors ${
                        password && passwordStrength.score >= step
                          ? passwordStrength.barClass
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    password ? passwordStrength.textClass : "text-slate-400"
                  }`}
                >
                  {password ? passwordStrength.label : "Min. 6+ chars"}
                </span>
              </div>
            )}
          </div>

          {/* Dynamic Plan Selector if no plan specified in url */}
          {mode === "register" && !urlPlan && (
            <div>
              <label className={labelClass}>Subscription Plan</label>
              {plansLoading ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : planOptions.length === 0 ? (
                <p className="text-[11px] text-slate-400">No active plans available.</p>
              ) : (
                <>
                  <div className={`grid gap-1.5 ${planOptions.length >= 5 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                    {planOptions.map((plan) => {
                      const isSelected = selectedPlan === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`rounded-xl border px-1.5 py-2 text-center transition-all ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-50/75 text-indigo-700 ring-2 ring-indigo-500/15"
                              : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-white"
                          }`}
                        >
                          <div className="text-[11px] font-bold leading-tight truncate">{plan.name}</div>
                          <div
                            className={`text-[10px] font-semibold mt-0.5 ${
                              isSelected ? "text-indigo-600" : "text-slate-500"
                            }`}
                          >
                            {plan.price}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400 font-medium">
                    {selectedPlan === "free" || currentPlanOption?.price === "$0/mo"
                      ? `Free forever • ${currentPlanOption?.limits?.agents ?? 1} agent, ${currentPlanOption?.limits?.websites ?? 1} website`
                      : `14-day free trial • ${currentPlanOption?.limits?.agents ?? 2} agents, ${currentPlanOption?.limits?.websites ?? 1} websites`}
                  </p>
                </>
              )}
            </div>
          )}

          {mode === "login" && needsTwoFactor && (
            <div>
              <label className={labelClass}>Authenticator Code</label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className={`${inputClass} tracking-[0.25em] text-center font-bold`}
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl text-[11px] font-semibold text-center border border-rose-200/80">
            {error}
          </div>
        )}

        {/* Submit */}
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
          ) : mode === "login" ? (
            "Sign In"
          ) : (
            "Create Account"
          )}
        </button>

        {mode === "register" && (
          <p className="text-[10px] text-slate-400 text-center leading-snug">
            By creating an account, you agree to our Terms of Service &amp; Privacy Policy.
          </p>
        )}
      </form>
    </AuthShell>
  );
}
