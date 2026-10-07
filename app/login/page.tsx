"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-client";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { email, name } = useAuth();
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setIsError(false);
    const sb = supabaseBrowser();
    if (!sb) {
      setMessage("ยังไม่ได้ตั้งค่า Supabase กรุณาตรวจสอบ environment variables ตาม README");
      setIsError(true);
      setBusy(false);
      return;
    }

    try {
      const { error } = await sb.auth.signInWithPassword({ email: em, password: pw });
      if (error) {
        setMessage(error.message);
        setIsError(true);
        return;
      }
      window.location.href = "/chat";
    } catch {
      setMessage("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    const sb = supabaseBrowser();
    if (!sb) return;
    await sb.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <main className="page-container narrow">
      <section className="auth-card panel">
        <div className="auth-intro">
          <span className="brand-mark">CM</span>
          <p className="eyebrow">ยินดีต้อนรับกลับ</p>
          <h1 className="page-title">เข้าสู่ระบบ</h1>
          <p className="page-description">เข้าใช้งานพื้นที่เรียนรู้ของคุณต่อได้เลย</p>
        </div>
        {email ? (
          <div className="form-stack">
            <div className="notice">
              เข้าสู่ระบบแล้วในชื่อ {name || email} ({email})
            </div>
            <button className="button-secondary button" type="button" onClick={logout}>
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <form className="form-stack" onSubmit={login}>
            <label className="field-label">
              อีเมล
              <input
                className="text-input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={em}
                onChange={(event) => setEm(event.target.value)}
              />
            </label>
            <label className="field-label">
              รหัสผ่าน
              <input
                className="text-input"
                type="password"
                autoComplete="current-password"
                placeholder="กรอกรหัสผ่าน"
                required
                value={pw}
                onChange={(event) => setPw(event.target.value)}
              />
            </label>
            <button className="button" type="submit" disabled={busy}>
              {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
            <p className="form-help">
              ใช้บัญชีที่ตั้งค่าไว้ใน Supabase Auth · ยังไม่มีบัญชี?{" "}
              <Link href="/signup">สมัครสมาชิก</Link>
            </p>
          </form>
        )}
        {message && <p className={`notice${isError ? " error" : ""}`} role="alert">{message}</p>}
      </section>
    </main>
  );
}
