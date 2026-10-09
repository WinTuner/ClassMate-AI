// Client Component — เหตุผล: หน้าแชท interactive ทั้งหมด (พิมพ์คำถาม, เก็บ
// conversation_id ต่อบทสนทนา, แสดง loading/error แบบทันที) ต้องใช้ useState +
// fetch POST /api/chat จาก browser จึงรันบน client
"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { friendlyApiError } from "@/lib/api-error";

type ChatResult = {
  answer?: string;
  citations?: unknown[];
  conversation_id?: string;
  [key: string]: unknown;
};

export default function ChatPage() {
  const { name } = useAuth();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError("");
    setNeedsLogin(false);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.trim(), conversation_id: conversationId ?? undefined }),
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
      const answer = data as ChatResult;
      setResult(answer);
      if (typeof answer.conversation_id === "string") setConversationId(answer.conversation_id);
      setQ("");
    } catch {
      setError("เชื่อมต่อระบบถามตอบไม่ได้ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  const citations = Array.isArray(result?.citations) ? result.citations : [];

  return (
    <main className="page-container narrow">
      <p className="eyebrow">ผู้ช่วยการเรียน {name ? `· ${name}` : ""}</p>
      <h1 className="page-title">ถามจากเอกสารของคุณ</h1>
      <p className="page-description">
        ถามได้ทั้งสรุป แนวคิด หรือรายละเอียดจาก PDF ที่อัปโหลด ระบบจะแสดงแหล่งอ้างอิงเมื่อมีข้อมูล
      </p>
      <section className="panel">
        <form className="form-stack" onSubmit={send}>
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
            {busy ? "กำลังค้นหาคำตอบ..." : "ส่งคำถาม"}
          </button>
        </form>
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
        {result && (
          <div className="answer-box" aria-live="polite">
            <h2>คำตอบ</h2>
            <p className="answer-text">
              {typeof result.answer === "string" ? result.answer : JSON.stringify(result, null, 2)}
            </p>
            {citations.length > 0 && (
              <div>
                <h3 style={{ marginTop: 22 }}>แหล่งอ้างอิง</h3>
                <ul className="citation-list">
                  {citations.map((citation, index) => (
                    <li key={index}>
                      {typeof citation === "string" ? citation : JSON.stringify(citation)}
                    </li>
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
