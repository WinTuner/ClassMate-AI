// Client Component — เหตุผล: ทุกอย่าง interactive ใน browser (เลือกเอกสาร,
// พิมพ์คำถาม, ค้น TF-IDF ในเครื่อง, ยิง POST /api/chat) — ไฟล์ไม่ออกจากเครื่อง
// มีแค่ชิ้นที่ค้นเจอถูกส่งไปให้ ThaiLLM ตอบ ไม่บันทึกประวัติ
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { friendlyApiError } from "@/lib/api-error";
import { searchLocal, type LocalChunk } from "@/lib/local-rag";
import { listDocs, type LocalDoc } from "@/lib/local-docs";

type Citation = { file: string; page: number };

export default function ChatPage() {
  const { name } = useAuth();
  const [docs, setDocs] = useState<LocalDoc[]>([]);
  const [docId, setDocId] = useState("");
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listDocs()
      .then((all) => {
        setDocs(all);
        if (all.length > 0) setDocId(all[0].id);
      })
      .catch(() => setDocs([]));
  }, []);

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!q.trim() || !docId) return;
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return;
    setBusy(true);
    setError("");
    setNeedsLogin(false);
    try {
      // ค้นในเครื่องก่อน — ได้ชิ้นไหนค่อยส่งชิ้นนั้นไปถาม
      const hits = searchLocal(doc.chunks as LocalChunk[], q.trim(), 5);
      if (hits.length === 0) {
        setAnswer("ไม่พบในเอกสารที่เลือก");
        setCitations([]);
        setQ("");
        return;
      }
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.trim(),
          context: hits.map((h) => ({ content: h.content, page: h.page, file: doc.filename })),
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const friendly = friendlyApiError(
          response.status,
          data,
          "ไม่สามารถตอบคำถามได้ กรุณาลองอีกครั้ง"
        );
        setError(friendly.text);
        setNeedsLogin(friendly.needsLogin);
        return;
      }
      const out = data as { answer?: unknown };
      setAnswer(typeof out.answer === "string" ? out.answer : JSON.stringify(data));
      setCitations(hits.map((h) => ({ file: doc.filename, page: h.page })));
      setQ("");
    } catch {
      setError("เชื่อมต่อระบบถามตอบไม่ได้ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page-container narrow">
      <p className="eyebrow">ผู้ช่วยการเรียน {name ? `· ${name}` : ""}</p>
      <h1 className="page-title">ถามจากเอกสารของคุณ</h1>
      <p className="page-description">
        เลือกเอกสาร แล้วถามได้ทั้งสรุป แนวคิด หรือรายละเอียด — ค้นในเครื่องก่อนส่งไปถาม AI
      </p>
      <section className="panel">
        {docs.length === 0 ? (
          <div className="answer-box">
            <h2>ยังไม่มีเอกสารในเครื่อง</h2>
            <p className="muted-text">เพิ่มไฟล์ PDF ก่อน แล้วกลับมาถามได้เลย</p>
            <Link className="button" href="/upload">เพิ่มเอกสาร</Link>
          </div>
        ) : (
          <form className="form-stack" onSubmit={send}>
            <label className="field-label" htmlFor="doc">
              เอกสารที่จะถาม
              <select
                className="select-input"
                id="doc"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
              >
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename} ({d.pages} หน้า)
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label" htmlFor="question">คำถาม</label>
            <textarea
              className="text-area"
              id="question"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="เช่น อธิบายแนวคิดหลักในบทนี้ให้เข้าใจง่าย"
              required
            />
            <button className="button" type="submit" disabled={busy || !q.trim()}>
              {busy ? "กำลังค้นในเครื่อง+ถาม AI..." : "ส่งคำถาม"}
            </button>
          </form>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
            {needsLogin && (
              <>
                {" "}
                <Link href="/login">ไปหน้าเข้าสู่ระบบ</Link>
              </>
            )}
          </p>
        )}
        {answer && (
          <div className="answer-box" aria-live="polite">
            <h2>คำตอบ</h2>
            <p className="answer-text">{answer}</p>
            {citations.length > 0 && (
              <div>
                <h3 style={{ marginTop: 22 }}>แหล่งอ้างอิง</h3>
                <ul className="citation-list">
                  {citations.map((c, i) => (
                    <li key={i}>{c.file} หน้า {c.page}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
