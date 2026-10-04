"use client";
import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // คืน null แทน throw — กัน client-side crash ตอนยังไม่ตั้ง env บน Vercel
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}
