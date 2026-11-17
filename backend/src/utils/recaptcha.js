import AppError from "./AppError.js";

/**
 * Verifies a Google reCAPTCHA (v3 or v2) token via Google's siteverify endpoint.
 * Skips verification when NODE_ENV === "test" or RECAPTCHA_SECRET_KEY is not configured.
 */
export async function verifyRecaptchaToken(token, remoteIp = "") {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret || process.env.NODE_ENV === "test") {
    return true;
  }

  if (!token || typeof token !== "string" || !token.trim()) {
    throw new AppError("Security verification (reCAPTCHA) failed. Please refresh and try again.", 400);
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
    ...(remoteIp ? { remoteip: String(remoteIp) } : {})
  });

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const data = await response.json();
  if (!data?.success) {
    throw new AppError("reCAPTCHA verification failed. Please try again.", 400);
  }

  if (typeof data.score === "number" && data.score < 0.4) {
    throw new AppError("Suspicious automated activity detected. Please try again.", 403);
  }

  return true;
}
