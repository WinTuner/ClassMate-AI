import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { embedText } from "@/lib/gemini";
import { generateAnswer } from "@/lib/thaillm";
import { QUIZ_SYSTEM_PROMPT } from "@/lib/prompts";

// POST /api/quiz { topic, type, n } — generate + save to quizzes
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );
  const { data } = await sb.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { topic, type, n } = await req.json();
  if (!topic) return NextResponse.json({ error: "missing topic" }, { status: 400 });

  const admin = supabaseAdmin();
  const qEmb = await embedText(topic);
  const { data: hits } = await admin.rpc("match_chunks", {
    query_embedding: qEmb,
    match_user: data.user!.id,
    match_count: 8,
  });
  if (!hits?.length) return NextResponse.json({ error: "ไม่พบในเอกสารที่อัปโหลด" }, { status: 404 });

  const context = hits.map((h: { content: string; page: number }) => `[หน้า ${h.page}]\n${h.content}`).join("\n\n");
  const raw = await generateAnswer(QUIZ_SYSTEM_PROMPT, context, `สร้าง ${n ?? 5} ข้อ แบบ ${type ?? "MCQ"} เรื่อง ${topic} (ตอบ JSON array เท่านั้น)`);
  let payload;
  try {
    const m = raw.match(/\[[\s\S]*\]/);
    payload = JSON.parse(m ? m[0] : raw);
  } catch {
    payload = [{ raw }];
  }
  const { data: quiz } = await admin
    .from("quizzes")
    .insert({ user_id: data.user!.id, topic, payload })
    .select("id")
    .single();
  return NextResponse.json({ quiz_id: quiz!.id, quiz: payload });
}
