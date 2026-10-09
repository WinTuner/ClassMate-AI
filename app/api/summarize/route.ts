import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateAnswer } from "@/lib/thaillm";
import { SUMMARIZE_SYSTEM_PROMPT } from "@/lib/prompts";
import { checkRateLimit, DAILY_LIMIT } from "@/lib/rate-limit";
import type { IncomingChunk } from "../chat/route";

// POST /api/summarize { context: IncomingChunk[], mode: "short"|"long" } — สรุปแล้วจบ ไม่บันทึก
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

  const { context, mode } = await req.json();
  if (!Array.isArray(context) || context.length === 0)
    return NextResponse.json({ error: "ไม่พบเนื้อหาเอกสาร" }, { status: 404 });

  const ctx = (context as IncomingChunk[])
    .slice(0, 30)
    .map((c) => `[หน้า ${c.page}]\n${c.content}`)
    .join("\n\n");
  const summary = await generateAnswer(SUMMARIZE_SYSTEM_PROMPT, ctx, `สรุปแบบ${mode === "long" ? "ละเอียด" : "สั้น"}`);
  return NextResponse.json({ summary });
}
