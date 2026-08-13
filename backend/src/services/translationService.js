import { AiProviderManager } from "./aiProviderManager.js";

const LANGUAGE_MAP = {
  ar: { name: "Arabic", flag: "🇦🇪" },
  fr: { name: "French", flag: "🇫🇷" },
  es: { name: "Spanish", flag: "🇪🇸" },
  hi: { name: "Hindi", flag: "🇮🇳" },
  ru: { name: "Russian", flag: "🇷🇺" },
  de: { name: "German", flag: "🇩🇪" },
  zh: { name: "Chinese", flag: "🇨🇳" },
  en: { name: "English", flag: "🇬🇧" }
};

/**
 * Real-time Multilingual Translation Service
 * Uses Google Gemini AI driver to detect language and produce accurate translations.
 */
export async function translateChatMessage({ text, targetLang = "en" }) {
  if (!text || typeof text !== "string" || text.trim() === "") {
    return {
      originalText: text || "",
      translatedText: text || "",
      detectedLanguage: "en",
      detectedLanguageName: "English",
      flagSymbol: "🇬🇧"
    };
  }

  const prompt = `You are a professional real-time multilingual translator for an enterprise live chat system.
Analyze the following text and translate it into target language "${targetLang}".
Input Text: "${text.replace(/"/g, '\\"')}"

Respond STRICTLY in JSON format with no additional text or markdown fences:
{
  "detectedLanguage": "2-letter ISO code e.g. ar, fr, es, hi, ru, de, en",
  "detectedLanguageName": "Language name e.g. Arabic",
  "flagSymbol": "Country flag emoji e.g. 🇦🇪",
  "translatedText": "The accurate translated text"
}`;

  try {
    const gemini = AiProviderManager.getProvider("gemini");
    const result = await gemini.generateCompletion({
      prompt,
      temperature: 0.2,
      maxTokens: 500
    });

    if (result && result.text) {
      const cleanJson = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      const langCode = (parsed.detectedLanguage || "en").toLowerCase();
      const langMeta = LANGUAGE_MAP[langCode] || { name: parsed.detectedLanguageName || "Foreign", flag: parsed.flagSymbol || "🌐" };

      return {
        originalText: text,
        translatedText: parsed.translatedText || text,
        detectedLanguage: langCode,
        detectedLanguageName: langMeta.name,
        flagSymbol: langMeta.flag
      };
    }
  } catch (err) {
    console.error("[Translation Service Error]", err.message);
  }

  // Graceful Fallback
  return {
    originalText: text,
    translatedText: text,
    detectedLanguage: "en",
    detectedLanguageName: "English",
    flagSymbol: "🇬🇧"
  };
}
