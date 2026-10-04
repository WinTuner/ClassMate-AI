import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { generateAnswer } from "@/lib/gemini";
import { SUMMARIZE_SYSTEM_PROMPT } from "@/lib/prompts";

// POST /api/summarize { doc_id, pages?: number[], mode: "short"|"long" }
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );
  const { data } = await sb.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { doc_id, pages, mode } = await req.json();
  if (!doc_id) return NextResponse.json({ error: "missing doc_id" }, { status: 400 });

  const admin = supabaseAdmin();
  let q = admin.from("chunks").select("content,page,documents!inner(filename)").eq("doc_id", doc_id).eq("user_id", data.user!.id).limit(30);
  if (pages?.length) q = q.in("page", pages);
  const { data: chunks, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!chunks?.length) return NextResponse.json({ error: "ไม่พบเนื้อหาเอกสาร" }, { status: 404 });

  const context = chunks.map((c: { content: string; page: number }) => `[หน้า ${c.page}]\n${c.content}`).join("\n\n");
  const summary = await generateAnswer(SUMMARIZE_SYSTEM_PROMPT, context, `สรุปแบบ${mode === "long" ? "ละเอียด" : "สั้น"}`);
  return NextResponse.json({ summary });
}
