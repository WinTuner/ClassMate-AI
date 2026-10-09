import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateAnswer } from "@/lib/thaillm";
import { CHAT_SYSTEM_PROMPT, NOT_FOUND_TH } from "@/lib/prompts";
import { checkRateLimit, DAILY_LIMIT } from "@/lib/rate-limit";

export type IncomingChunk = { content: string; page: number; file?: string };

// POST /api/chat { question, context: IncomingChunk[] }
// Privacy: server รับแค่ชิ้นที่ค้นแล้วจากเครื่อง user มาตอบ ไม่บันทึกอะไรเลย
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

  const { question, context } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "empty question" }, { status: 400 });
  if (!Array.isArray(context) || context.length === 0)
    return NextResponse.json({ answer: NOT_FOUND_TH, citations: [] });

  const ctx = (context as IncomingChunk[])
    .slice(0, 8)
    .map((h) => `[${h.file ?? "doc"}, หน้า ${h.page}]\n${h.content}`)
    .join("\n\n");
  const answer = await generateAnswer(CHAT_SYSTEM_PROMPT, ctx, question);
  return NextResponse.json({ answer });
}
