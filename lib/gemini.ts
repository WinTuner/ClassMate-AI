import { GoogleGenerativeAI } from "@google/generative-ai";

// Embeddings only (768-dim, matches supabase vector(768)).
// Answer generation moved to ThaiLLM (lib/thaillm.ts).
// All Gemini calls run server-side only. Key never leaves server.
export function gemini() {
  const key = process.env.GEMINI_API_KEY!;
  if (!key) throw new Error("Missing GEMINI_API_KEY (server env)");
  return new GoogleGenerativeAI(key);
}

export async function embedText(text: string): Promise<number[]> {
  const genAI = gemini();
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const res = await model.embedContent(text);
  return res.embedding.values;
}
