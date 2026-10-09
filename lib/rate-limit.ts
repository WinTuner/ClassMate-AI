import type { SupabaseClient } from "@supabase/supabase-js";

// Rate limit รายคน: นับจำนวนครั้งที่ใช้ AI ต่อวัน (เก็บแค่ตัวเลข ไม่แตะเนื้อหา)
// ใช้ผ่าน Route Handler ทุกเส้น (chat/quiz/summarize) — เกินลิมิตตอบ 429
export const DAILY_LIMIT = 30;

export async function checkRateLimit(
  sb: SupabaseClient
): Promise<{ ok: true } | { ok: false }> {
  // bump_usage() เป็น RPC นับแบบ atomic (กันยิงพร้อมกันแล้วหลุด)
  const { data, error } = await sb.rpc("bump_usage");
  // ตารางยังไม่ถูกสร้าง (ยังไม่รัน SQL) → เปิดให้ใช้ไปก่อน (fail-open)
  if (error) return { ok: true };
  return typeof data === "number" && data > DAILY_LIMIT
    ? { ok: false }
    : { ok: true };
}

export async function remainingQuota(sb: SupabaseClient): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  const { data } = await sb
    .from("daily_usage")
    .select("count")
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  const used =
    data && typeof (data as { count: unknown }).count === "number"
      ? (data as { count: number }).count
      : 0;
  return { limit: DAILY_LIMIT, used, remaining: Math.max(0, DAILY_LIMIT - used) };
}
