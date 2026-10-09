// Server Component — เหตุผล: เช็ค Supabase ด้วย SERVICE_ROLE_KEY ซึ่งอยู่บน server
// เท่านั้น (ห้ามหลุดไป browser) + นับจำนวนแถวแบบไม่แยก user
// ไม่มี "use client" ทั้งไฟล์ = Server Component แท้
// Data fetching: SSR เจตนา (dynamic="force-dynamic" + revalidate=0)
// — ทำไมไม่ SSG/ISR: หน้านี้คือ health-check ต้องสดทุกครั้งที่เปิด
// ถ้า cache ไว้จะบอกว่า "พร้อม" ทั้งที่ DB ล่มไปแล้ว
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
    <main className="page-container narrow">
      <p className="eyebrow">การเชื่อมต่อ</p>
      <h1 className="page-title">สถานะระบบ</h1>
      <p className="page-description">ตรวจสอบการเชื่อมต่อ Supabase และจำนวนข้อมูลในระบบ</p>
      <section className="panel">
        <h2>{s.ok ? "ระบบพร้อมใช้งาน" : "ระบบยังไม่พร้อม"}</h2>
        <p className={`notice${s.ok ? "" : " error"}`} role={s.ok ? "status" : "alert"}>{s.message}</p>
        <p className="muted-text">ตรวจสอบล่าสุด {new Date(s.checkedAt).toLocaleString("th-TH")}</p>
      {s.counts && (
        <div className="stat-grid">
          <div className="stat-card"><span>เอกสาร</span><strong>{s.counts.documents}</strong></div>
          <div className="stat-card"><span>บทสนทนา</span><strong>{s.counts.conversations}</strong></div>
          <div className="stat-card"><span>แบบทดสอบ</span><strong>{s.counts.quizzes}</strong></div>
        </div>
      )}
      </section>
    </main>
  );
}
