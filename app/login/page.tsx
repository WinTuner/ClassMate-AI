// Client Component — เหตุผล: ฟอร์ม interactive (useState/useAuth/onSubmit/fetch
// ฝั่ง browser + ต้องอ่าน Supabase session จาก browser) จึงรันบน client เท่านั้น
// validate ด้วย react-hook-form + zod (schema ข้างล่าง) ก่อนยิง Supabase Auth
"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabaseBrowser } from "@/lib/supabase-client";
import { useAuth } from "@/components/AuthProvider";

// zod schema = กติกาฝั่งเดียว (type + rule) — เปลี่ยนกติกาที่นี่ที่เดียว
const loginSchema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});
type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { email, name } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const login = async (values: LoginValues) => {
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
      const { error } = await sb.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) {
        setMessage(error.message);
        setIsError(true);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next?.startsWith("/") && !next.startsWith("//") ? next : "/chat";
    } catch {
      setMessage("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  };

  const logout = async (global: boolean) => {
    const sb = supabaseBrowser();
    if (!sb) return;
    // global = ล้างทุก session ของ user นี้ (ทุก browser/เครื่อง), local = แค่เครื่องนี้
    await sb.auth.signOut(global ? { scope: "global" } : undefined);
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
            <button className="button-secondary button" type="button" onClick={() => logout(false)}>
              ออกจากระบบ
            </button>
            <button className="button" type="button" onClick={() => logout(true)}>
              ออกจากระบบทุกเครื่อง
            </button>
          </div>
        ) : (
          <form className="form-stack" onSubmit={handleSubmit(login)} noValidate>
            <label className="field-label">
              อีเมล
              <input
                className="text-input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && <span className="notice error" role="alert">{errors.email.message}</span>}
            </label>
            <label className="field-label">
              รหัสผ่าน
              <input
                className="text-input"
                type="password"
                autoComplete="current-password"
                placeholder="กรอกรหัสผ่าน"
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              {errors.password && <span className="notice error" role="alert">{errors.password.message}</span>}
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
