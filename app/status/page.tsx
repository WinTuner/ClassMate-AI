// Server Component — ดึงข้อมูลจริง (Supabase connectivity + counts) ฝั่ง server
// ไม่มี "use client" ทั้งไฟล์ = Server Component แท้
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const checkedAt = new Date().toISOString();
  if (!url || !serviceKey) {
    return {
      ok: false,
      checkedAt,
      message: "Missing Supabase server env — ตั้งค่าใน Vercel → Settings → Environment Variables",
      counts: null,
    };
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, serviceKey);
    const [docs, convs, quizzes] = await Promise.all([
      sb.from("documents").select("id", { count: "exact", head: true }),
      sb.from("conversations").select("id", { count: "exact", head: true }),
      sb.from("quizzes").select("id", { count: "exact", head: true }),
    ]);
    const err = docs.error || convs.error || quizzes.error;
    if (err) return { ok: false, checkedAt, message: err.message, counts: null };
    return {
      ok: true,
      checkedAt,
      message: "เชื่อม Supabase สำเร็จ (server-side fetch)",
      counts: {
        documents: docs.count ?? 0,
        conversations: convs.count ?? 0,
        quizzes: quizzes.count ?? 0,
      },
    };
  } catch (e: any) {
    return { ok: false, checkedAt, message: e?.message ?? "fetch failed", counts: null };
  }
}

export default async function StatusPage() {
  const s = await getStatus();
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Status (Server Component + ข้อมูลจริง)</h1>
      <p>
        <a href="/">/ </a> · <a href="/documents">/documents</a> · <a href="/chat">/chat</a> ·{" "}
        <a href="/upload">/upload</a> · <a href="/quiz">/quiz</a>
      </p>
      <p>สถานะ: {s.ok ? "✅ OK" : "⚠️ ไม่พร้อม"}</p>
      <p>{s.message}</p>
      <p>ตรวจสอบเมื่อ (server time): {s.checkedAt}</p>
      {s.counts && (
        <ul>
          <li>documents: {s.counts.documents}</li>
          <li>conversations: {s.counts.conversations}</li>
          <li>quizzes: {s.counts.quizzes}</li>
        </ul>
      )}
    </main>
  );
}
