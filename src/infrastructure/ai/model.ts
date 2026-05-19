import { ChatOpenAI } from "@langchain/openai";

// --- OpenAI (modelo padrão, usado pelos agentes existentes) ---
const baseURL = process.env["AI_BASE_URL"];
if (!baseURL) throw new Error("AI_BASE_URL is not set");

const modelName = process.env["AI_MODEL"];
if (!modelName) throw new Error("AI_MODEL is not set");

export const model = new ChatOpenAI({
  model: modelName,
  apiKey: process.env["AI_API_KEY"] ?? "local",
  configuration: { baseURL },
});
