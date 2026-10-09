"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";

// Client Component + global state ฝั่ง client (React Context) — เหตุผล: ต้องใช้
// useState/useEffect อ่าน Supabase session ใน browser แล้วแชร์ให้ทุกหน้าผ่าน
// useAuth() โดยไม่ prop-drilling; เก็บแค่ display info (email/name) ไม่ถือ API key ใดๆ
type AuthCtx = { email: string | null; name: string | null; loading: boolean };
const Ctx = createContext<AuthCtx>({ email: null, name: null, loading: true });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<AuthCtx>({ email: null, name: null, loading: true });
  useEffect(() => {
    try {
      const sb = supabaseBrowser();
      if (!sb) {
        setS({ email: null, name: null, loading: false });
        return;
      }
      sb.auth.getUser().then(
        ({ data }) => {
          const u = data.user;
          setS({
            email: u?.email ?? null,
            name: (u?.user_metadata?.display_name as string) ?? u?.email?.split("@")[0] ?? null,
            loading: false,
          });
        },
        () => setS({ email: null, name: null, loading: false })
      );
    } catch {
      setS({ email: null, name: null, loading: false });
    }
  }, []);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
