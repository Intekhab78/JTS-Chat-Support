/**
 * Intelligent Language Detector & Prompt Language Enforcer
 * Accurately classifies visitor/caller inquiry language (English, Hinglish/Hindi, Arabic, etc.)
 * and generates unambiguous LLM directives to guarantee responses match the user's inquiry language.
 */

export function detectQueryLanguage(text) {
  if (!text || typeof text !== "string") {
    return { code: "en", name: "English", script: "Latin" };
  }

  const str = text.trim();
  if (!str) {
    return { code: "en", name: "English", script: "Latin" };
  }

  // 1. Arabic Unicode range (\u0600-\u06FF)
  if (/[\u0600-\u06FF]/.test(str)) {
    return { code: "ar", name: "Arabic", script: "Arabic" };
  }

  // 2. Hindi Devanagari Unicode range (\u0900-\u097F)
  if (/[\u0900-\u097F]/.test(str)) {
    return { code: "hi", name: "Hindi (Devanagari)", script: "Devanagari" };
  }

  // 3. Hinglish detection: check for distinctive Romanized Hindi words
  const hinglishPatterns = [
    /\b(aap|aapka|aapke|aapki|aapko|mera|mere|meri|mujhe|hum|humko|hamara|hamare|hamari|tum|tumhara|tumhe|apna|apne|apni)\b/i,
    /\b(kya|kaise|kyun|kyu|kab|kaha|kahan|kitna|kitne|kitni|kaun|kis|kisko|kiske|kiska)\b/i,
    /\b(hai|hain|ho|hun|hoon|tha|the|thi|hoga|hogi|honge|raha|rahe|rahi)\b/i,
    /\b(karo|karein|karna|karta|karte|karti|kijiye|batao|bataiye|bolo|boliye|dekh|dekho|suno|bhejo)\b/i,
    /\b(nahi|nhi|mat|achha|achhi|theek|thik|sahi|chahiye|chal|baat|kaam|pucha|pucho|batana)\b/i,
    /\b(bhi|aur|lekin|magar|par|pe|se|ko|ka|ke|ki|me|mein|ne|wali|wale|wala|yaha|waha|idhar|udhar)\b/i
  ];

  const words = str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  let hinglishCount = 0;
  for (const word of words) {
    if (hinglishPatterns.some(pattern => pattern.test(word))) {
      hinglishCount++;
    }
  }

  // Standard English question leaders, auxiliary verbs and common polite openers
  const englishLeadWords = new Set([
    "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
    "is", "are", "am", "was", "were", "do", "does", "did", "have", "has", "had",
    "can", "could", "will", "would", "shall", "should", "may", "might", "must",
    "please", "tell", "show", "give", "check", "hello", "hi", "hey", "good", "my", "your", "the"
  ]);

  const startsWithEnglishLead = words.length > 0 && englishLeadWords.has(words[0]);

  // If sentence starts with an obvious English question/verb, require strong Hinglish evidence
  if (startsWithEnglishLead && hinglishCount < 2) {
    return { code: "en", name: "English", script: "Latin" };
  }

  // Strong Hinglish evidence
  if (hinglishCount >= 2 || (words.length <= 4 && hinglishCount >= 1 && !startsWithEnglishLead)) {
    return { code: "hi-Latn", name: "Hindi / Hinglish (Roman Script)", script: "Latin" };
  }

  return { code: "en", name: "English", script: "Latin" };
}

/**
 * Returns strict system prompt instructions enforcing language matching
 */
export function getStrictLanguageInstruction(userText) {
  const lang = detectQueryLanguage(userText);

  if (lang.code === "en") {
    return {
      lang,
      directive: `MANDATORY LANGUAGE DIRECTIVE:
- The user's query is in ENGLISH ("${String(userText || '').replace(/"/g, '\\"')}").
- You MUST respond STRICTLY and EXCLUSIVELY in natural, fluent ENGLISH.
- DO NOT use Hindi, Hinglish, or any other language! Answering in Hindi or Hinglish when the query is in English is an ABSOLUTE ERROR.`
    };
  }

  if (lang.code === "hi-Latn") {
    return {
      lang,
      directive: `MANDATORY LANGUAGE DIRECTIVE:
- The user's query is in HINGLISH / HINDI (Roman letters): "${String(userText || '').replace(/"/g, '\\"')}".
- You MUST respond in polite, natural conversational Hinglish (Hindi written in Roman English alphabet).
- Do not respond in pure English; use natural conversational Hindi/Hinglish.`
    };
  }

  if (lang.code === "hi") {
    return {
      lang,
      directive: `MANDATORY LANGUAGE DIRECTIVE:
- The user's query is in HINDI (Devanagari script): "${String(userText || '').replace(/"/g, '\\"')}".
- You MUST respond in polite, natural Hindi (Devanagari script).`
    };
  }

  if (lang.code === "ar") {
    return {
      lang,
      directive: `MANDATORY LANGUAGE DIRECTIVE:
- The user's query is in ARABIC: "${String(userText || '').replace(/"/g, '\\"')}".
- You MUST respond in fluent, polite natural Arabic.`
    };
  }

  return {
    lang,
    directive: `MANDATORY LANGUAGE DIRECTIVE:
- Always respond in the EXACT same language that the user asked in.`
  };
}

