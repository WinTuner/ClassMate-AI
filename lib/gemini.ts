import { GoogleGenAI } from "@google/genai";

// Embeddings only — gemini-embedding-001 ขอ output 768-dim ผ่าน Matryoshka
// (ตรง schema supabase vector(768) เดิม ไม่ต้องแก้ SQL)
// Answer generation อยู่ ThaiLLM (lib/thaillm.ts)
// ทุก call รัน server-side เท่านั้น Key ไม่หลุดไป browser
export async function embedText(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY!;
  if (!key) throw new Error("Missing GEMINI_API_KEY (server env)");
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { outputDimensionality: 768 },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values) throw new Error("Embedding API returned no values");
  return values;
}
