import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export const llm = new OpenAI({
  baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env.GEMINI_API_KEY
});

export const DEFAULT_MODEL = "gemini-3.1-flash-lite";

// Wrapper function to execute Chat Completions with automatic retry on 429 errors
export async function createChatCompletionWithRetry(params, retries = 5, delayMs = 3000) {
  let currentDelay = delayMs;
  for (let i = 0; i < retries; i++) {
    try {
      return await llm.chat.completions.create(params);
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.message && err.message.includes('429'));
      if (isRateLimit && i < retries - 1) {
        console.warn(`[Gemini API] Rate limit (429) hit. Retrying in ${currentDelay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= 2; // exponential backoff
        continue;
      }
      throw err;
    }
  }
}
