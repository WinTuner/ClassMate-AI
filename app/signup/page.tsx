// Client Component — เหตุผล: ฟอร์มสมัครสมาชิก interactive (validate + เช็ค
// รหัสผ่านตรงกัน + เรียก Supabase Auth ฝั่ง browser) จึงต้องเป็น client
// validate ด้วย react-hook-form + zod (signupSchema) รวมกติกา: ชื่อ/อีเมล/รหัสผ่าน≥6/ยืนยันตรงกัน
"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabaseBrowser } from "@/lib/supabase-client";

const signupSchema = z
  .object({
    name: z.string().min(1, "กรุณากรอกชื่อที่แสดง").max(50, "ชื่อยาวเกิน 50 ตัวอักษร"),
    email: z.string().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
    password: z.string().min(6, "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร"),
    confirm: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "รหัสผ่านสองช่องไม่ตรงกัน",
    path: ["confirm"],
  });
type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const signup = async (values: SignupValues) => {
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
        email: values.email.trim(),
        password: values.password,
        options: { data: { display_name: values.name.trim() } },
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
            .upsert({ id: data.user?.id, email: values.email.trim(), display_name: values.name.trim() });
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
          <form className="form-stack" onSubmit={handleSubmit(signup)} noValidate>
            <label className="field-label">
              ชื่อที่แสดง
              <input
                className="text-input"
                type="text"
                autoComplete="nickname"
                placeholder="เช่น มินตรา"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && <span className="notice error" role="alert">{errors.name.message}</span>}
            </label>
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
                autoComplete="new-password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              {errors.password && <span className="notice error" role="alert">{errors.password.message}</span>}
            </label>
            <label className="field-label">
              ยืนยันรหัสผ่าน
              <input
                className="text-input"
                type="password"
                autoComplete="new-password"
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                {...register("confirm")}
                aria-invalid={!!errors.confirm}
              />
              {errors.confirm && <span className="notice error" role="alert">{errors.confirm.message}</span>}
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
