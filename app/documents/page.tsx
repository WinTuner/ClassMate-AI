import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component — ดึงข้อมูลจริงจาก Supabase ฝั่ง server (per-user ผ่าน cookie session + RLS)
// ไม่มี "use client" ทั้งไฟล์ = Server Component แท้
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getDocuments() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { error: "Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)", rows: null };
  }
  const cookieStore = cookies();
  const sb = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) {
    return { error: null, rows: [], notLoggedIn: true as const };
  }
  const { data, error } = await sb
    .from("documents")
    .select("id, filename, pages, status, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return { error: error.message, rows: null };
  return { error: null, rows: data };
}

export default async function DocumentsPage() {
  const result = await getDocuments();

  return (
    <main className="page-container narrow">
      <p className="eyebrow">คลังความรู้ของคุณ</p>
      <h1 className="page-title">เอกสารที่อัปโหลด</h1>
      <p className="page-description">รายการเอกสารล่าสุดที่พร้อมใช้ถามตอบและทบทวนบทเรียน</p>
      {"notLoggedIn" in result && result.notLoggedIn ? (
        <section className="panel">
          <p className="muted-text">เข้าสู่ระบบก่อนเพื่อดูเอกสารของคุณ</p>
          <Link className="button" href="/login">ไปหน้าเข้าสู่ระบบ</Link>
        </section>
      ) : result.error ? (
        <p className="notice error" role="alert">ดึงข้อมูลไม่ได้: {result.error}</p>
      ) : (
        <section className="panel">
          <p className="muted-text">แสดงเอกสารล่าสุด {result.rows?.length ?? 0} รายการ</p>
          {result.rows && result.rows.length > 0 ? (
          <ul className="data-list">
            {result.rows?.map((d: any) => (
              <li className="data-row" key={d.id}>
                <strong>{d.filename}</strong>
                <span>{d.pages} หน้า · {d.status} · {new Date(d.created_at).toLocaleDateString("th-TH")}</span>
              </li>
            ))}
          </ul>
          ) : (
            <div className="answer-box">
              <h2>ยังไม่มีเอกสาร</h2>
              <p className="muted-text">เพิ่มไฟล์ PDF เพื่อเริ่มใช้ผู้ช่วยการเรียนของคุณ</p>
              <Link className="button" href="/upload">อัปโหลดเอกสาร</Link>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
