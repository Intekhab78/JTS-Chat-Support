let loadPromise = null;

/**
 * Loads Google reCAPTCHA v3 script once and returns a fresh token for the given action.
 * Returns null if VITE_RECAPTCHA_SITE_KEY is not configured.
 */
export async function executeRecaptcha(action = "submit") {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim();
  if (!siteKey || typeof window === "undefined") {
    return null;
  }

  if (!window.grecaptcha) {
    if (!loadPromise) {
      loadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-recaptcha-v3="true"]');
        if (existing) {
          existing.addEventListener("load", () => resolve(window.grecaptcha));
          existing.addEventListener("error", reject);
          return;
        }
        const script = document.createElement("script");
        script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
        script.async = true;
        script.defer = true;
        script.setAttribute("data-recaptcha-v3", "true");
        script.onload = () => resolve(window.grecaptcha);
        script.onerror = () => reject(new Error("Failed to load Google reCAPTCHA"));
        document.head.appendChild(script);
      });
    }
    await loadPromise;
  }

  return new Promise((resolve, reject) => {
    if (!window.grecaptcha?.ready) {
      resolve(null);
      return;
    }
    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(siteKey, { action });
        resolve(token);
      } catch (err) {
        reject(err);
      }
    });
  });
}
