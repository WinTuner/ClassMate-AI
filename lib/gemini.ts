import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function generateAnswer(system: string, context: string, question: string) {
  const genAI = gemini();
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: system,
  });
  const prompt = `---เอกสาร---\n${context}\n---คำถาม---\n${question}`;
  const res = await model.generateContent(prompt);
  return res.response.text();
}
