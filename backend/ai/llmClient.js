import OpenAI from "openai";

export const llm = new OpenAI({
  baseURL: "http://127.0.0.1:1234/v1",
  apiKey: "lm-studio" 
});