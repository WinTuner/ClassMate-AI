"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";

// Context เก็บแค่ display info โชว์ชื่อ — ไม่ถือ API key ใดๆ
type AuthCtx = { email: string | null; name: string | null; loading: boolean };
const Ctx = createContext<AuthCtx>({ email: null, name: null, loading: true });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<AuthCtx>({ email: null, name: null, loading: true });
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => {
      const u = data.user;
      setS({
        email: u?.email ?? null,
        name: (u?.user_metadata?.display_name as string) ?? u?.email?.split("@")[0] ?? null,
        loading: false,
      });
    });
  }, []);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
