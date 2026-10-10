// Client Component — เหตุผล: หน้านี้โชว์สถานะคลังในเครื่อง (IndexedDB)
// ซึ่งอ่านได้แค่ใน browser + ข้อความ privacy จึงเป็น client
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listDocs } from "@/lib/local-docs";
import { useAuth } from "@/components/AuthProvider";

export default function StatusPage() {
  const { email, loading } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [quota, setQuota] = useState<{ limit: number; used: number; remaining: number } | null>(null);

  useEffect(() => {
    listDocs()
      .then((all) => setCount(all.length))
      .catch(() => setCount(0));
  }, []);

  useEffect(() => {
    if (!email) {
      setQuota(null);
      return;
    }

    fetch("/api/quota")
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => q && setQuota(q))
      .catch(() => undefined);
  }, [email]);

  if (!loading && !email) {
    return (
      <main className="page-container narrow">
        <p className="eyebrow">ความเป็นส่วนตัว</p>
        <h1 className="page-title">สถานะระบบ</h1>
        <section className="panel">
          <p className="notice" role="status">กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้</p>
          <Link className="button" href="/login?next=%2Fstatus">เข้าสู่ระบบ</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container narrow">
      <p className="eyebrow">ความเป็นส่วนตัว</p>
      <h1 className="page-title">สถานะระบบ</h1>
      <p className="page-description">เอกสารของคุณอยู่แค่ใน browser นี้ ไม่เคยส่งไป server</p>
      <section className="panel">
        <h2>โหมด privacy เปิดอยู่</h2>
        <p className="notice" role="status">
          PDF ถูกอ่าน แตกข้อความ และค้นในเครื่องทั้งหมด — server รับแค่ชิ้นที่ค้นเจอ
         เพื่อถาม AI แล้วทิ้งทันที ไม่บันทึกไฟล์ ประวัติแชท หรือผลสอบ
        </p>
        <p className="muted-text">
          เอกสารในเครื่องนี้: {count === null ? "กำลังนับ..." : `${count} ไฟล์`}
        </p>
        <div className="stat-grid">
          <div className="stat-card"><span>ไฟล์ออกนอกเครื่อง</span><strong>0</strong></div>
          <div className="stat-card"><span>ประวัติแชทที่บันทึก</span><strong>0</strong></div>
          <div className="stat-card">
            <span>โควตา AI วันนี้</span>
            <strong>{loading ? "กำลังตรวจสอบ..." : quota ? `${quota.remaining}/${quota.limit}` : "–"}</strong>
          </div>
        </div>
        <p style={{ marginTop: 24 }}>
          <Link className="button" href="/upload">เพิ่มเอกสาร</Link>
        </p>
      </section>
    </main>
  );
}
