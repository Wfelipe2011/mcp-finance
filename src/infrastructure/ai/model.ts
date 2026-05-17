import { ChatOpenAI } from "@langchain/openai";
import { ChatOpenRouter } from "@langchain/openrouter"

// --- OpenAI (modelo padrão, usado pelos agentes existentes) ---
const baseURL = process.env["AI_BASE_URL"];
console.log(`🚀 ~ process.env["AI_BASE_URL"]:`, process.env["AI_BASE_URL"])
if (!baseURL) throw new Error("AI_BASE_URL is not set");

const modelName = process.env["AI_MODEL"];
if (!modelName) throw new Error("AI_MODEL is not set");

  console.log(`🚀 ~ process.env["AI_API_KEY"]:`, process.env["AI_API_KEY"])
export const model = new ChatOpenAI({
  model: modelName,
  apiKey: process.env["AI_API_KEY"] ?? "local",
  configuration: { baseURL },
});

// --- DeepSeek ---
// Env vars: DEEPSEEK_API_KEY, DEEPSEEK_MODEL (padrão: deepseek-chat)
// export const modelDeepSeek = new ChatOpenAI({
//   model: process.env["DEEPSEEK_MODEL"] ?? "deepseek-chat",
//   apiKey: process.env["DEEPSEEK_API_KEY"] ?? "local",
//   configuration: { baseURL: "https://api.deepseek.com/v1" },
// });
export const modelDeepSeek = new ChatOpenRouter({
  // Specify the OpenRouter model identifier
  model: process.env["OPENROUTER_MODEL"] ?? "deepseek-chat", // Or "deepseek/deepseek-r1" for reasoning
  apiKey: process.env["OPENROUTER_API_KEY"] ?? "local", // Ensure this env variable is set
  temperature: 0.7,
});


// --- OpenRouter ---
// Env vars: OPENROUTER_API_KEY, OPENROUTER_MODEL (padrão: openai/gpt-4o-mini)
// export const modelOpenRouter = new ChatOpenAI({
//   model: process.env["OPENROUTER_MODEL"] ?? "openai/gpt-4o-mini",
//   apiKey: process.env["OPENROUTER_API_KEY"] ?? "local",
//   configuration: {
//     baseURL: "https://openrouter.ai/api/v1",
//     defaultHeaders: {
//       "HTTP-Referer": process.env["APP_URL"] ?? "https://localhost",
//       "X-Title": "mcp-finance",
//     },
//   },
// });
