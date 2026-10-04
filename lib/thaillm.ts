import OpenAI from "openai";

// All ThaiLLM calls run server-side only. Key never leaves server.
// OpenAI-compatible: baseURL https://api.thaillm.or.th/v1
export function thaillm() {
  const key = process.env.THAILLM_API_KEY!;
  if (!key) throw new Error("Missing THAILLM_API_KEY (server env)");
  return new OpenAI({
    apiKey: key,
    baseURL: process.env.THAILLM_BASE_URL ?? "https://api.thaillm.or.th/v1",
  });
}

export function thaillmModel() {
  // Typhoon-S 128K context — เหมาะกับเอกสารยาว
  return process.env.THAILLM_MODEL ?? "Typhoon-S-ThaiLLM-8B-Instruct";
}

export async function generateAnswer(system: string, context: string, question: string) {
  const client = thaillm();
  const res = await client.chat.completions.create({
    model: thaillmModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: `---เอกสาร---\n${context}\n---คำถาม---\n${question}` },
    ],
    temperature: 0.2,
  });
  return res.choices[0]?.message?.content ?? "ไม่พบในเอกสารที่อัปโหลด";
}
