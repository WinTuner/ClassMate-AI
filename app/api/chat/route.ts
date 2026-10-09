import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { embedText } from "@/lib/gemini";
import { generateAnswer } from "@/lib/thaillm";
import { CHAT_SYSTEM_PROMPT, NOT_FOUND_TH } from "@/lib/prompts";

const THRESHOLD = Number(process.env.SIMILARITY_THRESHOLD ?? 0.35);
const TOP_K = Number(process.env.TOP_K ?? 5);

// POST /api/chat { question } — RAG + guardrail
// Privacy: ไม่บันทึกประวัติบทสนทนา (ไม่ insert conversations/messages)
// ถาม-ตอบจบใน request เดียว ไม่มี conversation_id
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );
  const { data } = await sb.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = data.user;

  const { question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "empty question" }, { status: 400 });

  const admin = supabaseAdmin();
  const qEmb = await embedText(question);
  const { data: hits, error } = await admin.rpc("match_chunks", {
    query_embedding: qEmb,
    match_user: user.id,
    match_count: TOP_K,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const good = (hits ?? []).filter((h: { similarity: number }) => h.similarity >= THRESHOLD);

  if (good.length === 0) {
    return NextResponse.json({ answer: NOT_FOUND_TH, citations: [] });
  }

  const context = good
    .map((h: { content: string; filename?: string; page: number }) => `[${h.filename ?? "doc"}, หน้า ${h.page}]\n${h.content}`)
    .join("\n\n");
  const answer = await generateAnswer(CHAT_SYSTEM_PROMPT, context, question);
  const citations = good.map((h: { filename?: string; page: number; similarity: number }) => ({
    file: h.filename ?? "doc",
    page: h.page,
    score: h.similarity,
  }));

  return NextResponse.json({ answer, citations });
}
