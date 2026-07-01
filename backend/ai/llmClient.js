import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export const llm = new OpenAI({
  baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env.GEMINI_API_KEY,
  timeout: 30000 // 30 seconds request timeout
});

export const DEFAULT_MODEL = "gemini-3.1-flash-lite";

// Wrapper function to execute Chat Completions with automatic retry on 429 errors
export async function createChatCompletionWithRetry(params, promptMetadata = {}, retries = 3, delayMs = 2000) {
  const version = promptMetadata.version || "UNKNOWN";
  const chars = promptMetadata.chars || JSON.stringify(params.messages).length;
  const startTime = Date.now();

  let currentDelay = delayMs;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await llm.chat.completions.create(params);
      const duration = Date.now() - startTime;
      console.log(`[AI SUCCESS] Version: ${version} | Chars: ${chars} | Duration: ${duration}ms | Attempt: ${i + 1}/${retries + 1}`);
      return response;
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.message && err.message.includes('429'));
      if (isRateLimit && i < retries) {
        console.warn(`[AI RETRY] Rate limit (429) hit for ${version}. Retrying in ${currentDelay}ms... (Attempt ${i + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= 2; // exponential backoff
        continue;
      }
      const duration = Date.now() - startTime;
      console.error(`[AI ERROR] Version: ${version} | Chars: ${chars} | Duration: ${duration}ms | Attempt: ${i + 1}/${retries + 1} | Error: ${err.message}`);
      throw err;
    }
  }
}
