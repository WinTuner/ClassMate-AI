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
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Documents (Server Component + ข้อมูลจริง)</h1>
      <p>
        <a href="/">/ </a> · <a href="/status">/status</a> · <a href="/chat">/chat</a> ·{" "}
        <a href="/upload">/upload</a> · <a href="/quiz">/quiz</a>
      </p>
      {"notLoggedIn" in result && result.notLoggedIn ? (
        <p>
          ยังไม่ login — ไปที่ <a href="/login">/login</a> ก่อน แล้วกลับมาหน้านี้
          (server อ่าน session จาก cookie แล้ว query Supabase ตรง)
        </p>
      ) : result.error ? (
        <p style={{ color: "red" }}>ดึงข้อมูลไม่ได้: {result.error}</p>
      ) : (
        <>
          <p>เอกสารล่าสุด {result.rows?.length ?? 0} รายการ (ดึงฝั่ง server ทุก request)</p>
          <ul>
            {result.rows?.map((d: any) => (
              <li key={d.id}>
                {d.filename} — {d.pages} หน้า — {d.status} —{" "}
                {new Date(d.created_at).toLocaleString("th-TH")}
              </li>
            ))}
          </ul>
          {result.rows?.length === 0 && <p>ยังไม่มีเอกสาร อัปโหลดที่ /upload</p>}
        </>
      )}
    </main>
  );
}
