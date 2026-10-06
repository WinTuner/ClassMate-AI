"use client";
import { useState } from "react";

export default function QuizPage() {
  const [topic, setTopic] = useState("");
  const [out, setOut] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!topic.trim()) return;
    setBusy(true);
    setError("");
    setOut("");
    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), type: "MCQ", n: 5 }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const detail =
          typeof data === "object" && data !== null && "error" in data
            ? String(data.error)
            : "ไม่สามารถสร้างแบบทดสอบได้ กรุณาลองอีกครั้ง";
        setError(detail);
        return;
      }
      setOut(JSON.stringify(data, null, 2));
    } catch {
      setError("เชื่อมต่อระบบสร้างแบบทดสอบไม่ได้ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page-container narrow">
      <p className="eyebrow">ทบทวนความเข้าใจ</p>
      <h1 className="page-title">สร้างแบบทดสอบ</h1>
      <p className="page-description">ระบุหัวข้อที่ต้องการฝึก แล้วรับแบบทดสอบปรนัย 5 ข้อ</p>
      <section className="panel">
        <form className="form-stack" onSubmit={send}>
          <label className="field-label" htmlFor="quiz-topic">
            หัวข้อที่ต้องการทบทวน
            <input
              className="text-input"
              id="quiz-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="เช่น ระบบสุริยะ หรือ บทที่ 2"
              required
            />
          </label>
          <button className="button" type="submit" disabled={busy || !topic.trim()}>
            {busy ? "กำลังสร้างแบบทดสอบ..." : "สร้างแบบทดสอบ"}
          </button>
        </form>
        {error && <p className="notice error" role="alert">{error}</p>}
        {out && (
          <div className="answer-box" aria-live="polite">
            <h2>แบบทดสอบของคุณ</h2>
            <pre className="answer-text" style={{ overflowX: "auto", fontFamily: "inherit" }}>{out}</pre>
          </div>
        )}
      </section>
    </main>
  );
}
