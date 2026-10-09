import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateAnswer } from "@/lib/thaillm";
import { QUIZ_SYSTEM_PROMPT } from "@/lib/prompts";
import { checkRateLimit, DAILY_LIMIT } from "@/lib/rate-limit";
import type { IncomingChunk } from "../chat/route";

// POST /api/quiz { topic, type, n, context: IncomingChunk[] } — สร้างแล้วจบ ไม่บันทึก
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );
  const { data } = await sb.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(sb);
  if (!rl.ok)
    return NextResponse.json(
      { error: `ใช้ครบ ${DAILY_LIMIT} ครั้ง/วันแล้ว ลองใหม่พรุ่งนี้` },
      { status: 429 }
    );

  const { topic, type, n, context } = await req.json();
  if (!topic) return NextResponse.json({ error: "missing topic" }, { status: 400 });
  if (!Array.isArray(context) || context.length === 0)
    return NextResponse.json({ error: "ไม่พบในเอกสารที่เลือก" }, { status: 404 });

  const ctx = (context as IncomingChunk[])
    .slice(0, 8)
    .map((h) => `[หน้า ${h.page}]\n${h.content}`)
    .join("\n\n");
  const raw = await generateAnswer(QUIZ_SYSTEM_PROMPT, ctx, `สร้าง ${n ?? 5} ข้อ แบบ ${type ?? "MCQ"} เรื่อง ${topic} (ตอบ JSON array เท่านั้น)`);
  let payload;
  try {
    const m = raw.match(/\[[\s\S]*\]/);
    payload = JSON.parse(m ? m[0] : raw);
  } catch {
    payload = [{ raw }];
  }
  return NextResponse.json({ quiz: payload });
}
