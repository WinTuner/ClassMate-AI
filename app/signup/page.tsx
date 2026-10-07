"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const signup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pw !== pw2) {
      setMessage("รหัสผ่านสองช่องไม่ตรงกัน");
      setIsError(true);
      return;
    }
    if (pw.length < 6) {
      setMessage("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
      setIsError(true);
      return;
    }
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
      const { data, error } = await sb.auth.signUp({
        email: em.trim(),
        password: pw,
        options: { data: { display_name: name.trim() } },
      });
      if (error) {
        setMessage(error.message);
        setIsError(true);
        return;
      }
      if (data.session) {
        // เข้าใช้ได้ทันที (โปรเจกต์ปิด email confirmation) — เก็บแถว users ไว้ด้วยแบบ best-effort
        try {
          await sb
            .from("users")
            .upsert({ id: data.user?.id, email: em.trim(), display_name: name.trim() });
        } catch {
          /* ไม่บล็อกการสมัคร */
        }
        window.location.href = "/chat";
      } else {
        // โปรเจกต์เปิด email confirmation — ให้ผู้ใช้กดลิงก์ในอีเมลก่อน
        setCheckEmail(true);
        setMessage("สมัครสำเร็จ กรุณากดลิงก์ยืนยันในอีเมลก่อนเข้าสู่ระบบ");
        setIsError(false);
      }
    } catch {
      setMessage("สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page-container narrow">
      <section className="auth-card panel">
        <div className="auth-intro">
          <span className="brand-mark">CM</span>
          <p className="eyebrow">เริ่มต้นใช้งาน</p>
          <h1 className="page-title">สมัครสมาชิก</h1>
          <p className="page-description">สร้างบัญชีเพื่ออัปโหลดเอกสารและเริ่มเรียนกับ AI</p>
        </div>
        {checkEmail ? (
          <div className="notice" role="status">
            {message} จากนั้นไป <Link href="/login">เข้าสู่ระบบ</Link>
          </div>
        ) : (
          <form className="form-stack" onSubmit={signup}>
            <label className="field-label">
              ชื่อที่แสดง
              <input
                className="text-input"
                type="text"
                autoComplete="nickname"
                placeholder="เช่น มินตรา"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
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
                autoComplete="new-password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                required
                minLength={6}
                value={pw}
                onChange={(event) => setPw(event.target.value)}
              />
            </label>
            <label className="field-label">
              ยืนยันรหัสผ่าน
              <input
                className="text-input"
                type="password"
                autoComplete="new-password"
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                required
                value={pw2}
                onChange={(event) => setPw2(event.target.value)}
              />
            </label>
            <button className="button" type="submit" disabled={busy}>
              {busy ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </button>
            <p className="form-help">
              มีบัญชีแล้ว? <Link href="/login">เข้าสู่ระบบ</Link>
            </p>
          </form>
        )}
        {message && !checkEmail && (
          <p className={`notice${isError ? " error" : ""}`} role="alert">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
