import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { validatePdfBuffer } from "@/lib/validate-pdf";
import { chunkText } from "@/lib/chunk";
import { embedText } from "@/lib/gemini";

async function getUserId() {
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );
  const { data } = await sb.auth.getUser();
  return data.user;
}

// POST /api/ingest — form-data: file:PDF (login required, validate → parse → chunk → embed)
export async function POST(req: NextRequest) {
  const user = await getUserId();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });

  // กันอัปโหลดไฟล์เดิมซ้ำ (เช็กก่อนเสียเวลาอ่าน/ฝัง embeddings)
  const admin = supabaseAdmin();
  const { data: dup } = await admin
    .from("documents")
    .select("id")
    .eq("user_id", user.id)
    .eq("filename", file.name)
    .limit(1);
  if (dup && dup.length > 0)
    return NextResponse.json(
      { error: `ไฟล์ "${file.name}" อยู่ในคลังแล้ว ไม่ต้องอัปโหลดซ้ำ` },
      { status: 409 }
    );

  const buf = Buffer.from(await file.arrayBuffer());
  const v = validatePdfBuffer(buf, file.type);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  let parsed;
  try {
    parsed = await pdfParse(buf);
  } catch {
    return NextResponse.json({ error: "อ่าน PDF ไม่ได้ ไฟล์อาจเสีย/เข้ารหัส" }, { status: 400 });
  }
  if (!parsed.text || parsed.text.trim().length < 100)
    return NextResponse.json(
      { error: "ดึงข้อความไม่ได้ (สแกนภาพล้วน?) อัปโหลดไฟล์ที่มี text layer" },
      { status: 400 }
    );

  const { data: doc, error: docErr } = await admin
    .from("documents")
    .insert({ user_id: user.id, filename: file.name, pages: parsed.numpages, status: "ready" })
    .select("id")
    .single();
  if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 });

  const chunks = chunkText(parsed.text);
  for (let i = 0; i < chunks.length; i++) {
    const emb = await embedText(chunks[i]);
    // page estimate: proportional (pdf-parse doesn't give per-page easily)
    const page = Math.min(parsed.numpages, Math.floor((i / chunks.length) * parsed.numpages) + 1);
    await admin.from("chunks").insert({
      doc_id: doc.id,
      user_id: user.id,
      page,
      content: chunks[i],
      embedding: emb,
    });
  }
  return NextResponse.json({ doc_id: doc.id, pages: parsed.numpages, chunks: chunks.length });
}
