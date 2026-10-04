"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";
import { useAuth } from "@/components/AuthProvider";

// หน้ากากๆ ให้เพื่อนทำต่อ — login แล้วโชว์ชื่อผ่าน Context
export default function LoginPage() {
  const { email, name } = useAuth();
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const login = async () => {
    const sb = supabaseBrowser();
    if (!sb) {
      alert("ยังไม่ตั้งค่า Supabase env บน Vercel — login ไม่ได้");
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email: em, password: pw });
    if (error) alert(error.message);
    else location.href = "/chat";
  };
  return (
    <main style={{ padding: 24 }}>
      <h2>Login (กากๆ)</h2>
      {email && <p>ล็อกอินแล้ว: {name} ({email})</p>}
      <input placeholder="email" value={em} onChange={(e) => setEm(e.target.value)} /><br />
      <input placeholder="password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /><br />
      <button onClick={login}>Login</button>
    </main>
  );
}
