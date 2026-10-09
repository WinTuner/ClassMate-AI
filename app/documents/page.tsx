// Client Component — เหตุผล: คลังเอกสารอยู่ใน IndexedDB ของเครื่องนี้
// ต้องอ่านด้วย browser API จึงเป็น client; ลบก็ลบแค่ในเครื่อง
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listDocs, deleteDoc, type LocalDoc } from "@/lib/local-docs";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<LocalDoc[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => setDocs(await listDocs());
  useEffect(() => {
    reload().catch(() => setDocs([]));
  }, []);

  const remove = async (id: string, filename: string) => {
    if (!window.confirm(`ลบ "${filename}" ออกจากเครื่อง?`)) return;
    setBusyId(id);
    try {
      await deleteDoc(id);
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="page-container narrow">
      <p className="eyebrow">คลังความรู้ของคุณ</p>
      <h1 className="page-title">เอกสารในเครื่อง</h1>
      <p className="page-description">ไฟล์ทั้งหมดอยู่แค่ใน browser นี้ ไม่เคยส่งไป server</p>
      <section className="panel">
        {docs === null ? (
          <p className="muted-text">กำลังเปิดคลังในเครื่อง...</p>
        ) : docs.length === 0 ? (
          <div className="answer-box">
            <h2>ยังไม่มีเอกสาร</h2>
            <p className="muted-text">เพิ่มไฟล์ PDF เพื่อเริ่มใช้ผู้ช่วยการเรียนของคุณ</p>
            <Link className="button" href="/upload">เพิ่มเอกสาร</Link>
          </div>
        ) : (
          <>
            <p className="muted-text">มีเอกสาร {docs.length} ไฟล์ในเครื่องนี้</p>
            <ul className="data-list">
              {docs.map((d) => (
                <li className="data-row" key={d.id}>
                  <strong>{d.filename}</strong>
                  <span>
                    {d.pages} หน้า · {d.chunks.length} ชิ้น ·{" "}
                    {new Date(d.createdAt).toLocaleDateString("th-TH")}
                  </span>
                  <button
                    className="button-secondary button-small button"
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => remove(d.id, d.filename)}
                  >
                    {busyId === d.id ? "กำลังลบ..." : "ลบ"}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
