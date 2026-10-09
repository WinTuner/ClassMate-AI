// Client Component — เหตุผล: โหมดทำข้อสอบ interactive (เลือกช้อยส์, นับคะแนน,
// เฉลยเป็นข้อๆ) เป็น state ฝั่ง browser ล้วน + ค้น TF-IDF ในเครื่องก่อนยิง
// POST /api/quiz — ไฟล์ไม่ออกจากเครื่อง ไม่บันทึกผล
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { friendlyApiError } from "@/lib/api-error";
import { searchLocal, type LocalChunk } from "@/lib/local-rag";
import { listDocs, type LocalDoc } from "@/lib/local-docs";

type QuizItem = {
  type?: string;
  question?: string;
  choices?: unknown[];
  answer?: unknown;
  explanation?: string;
  citation?: unknown;
  raw?: string;
  [key: string]: unknown;
};

const toText = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value);

const normalize = (value: unknown): string => toText(value).trim().toLowerCase();

// Map the model's `answer` to a choice index when possible:
// supports letter answers ("A", "ก", "1") or full-text answers.
const answerIndex = (item: QuizItem): number | null => {
  const choices = Array.isArray(item.choices) ? item.choices : [];
  if (choices.length === 0 || item.answer === undefined) return null;
  const ans = normalize(item.answer);
  const letters = ["a", "b", "c", "d", "e", "f"];
  const thaiLetters = ["ก", "ข", "ค", "ง", "จ", "ฉ"];
  const letterHit = [...letters, ...thaiLetters].indexOf(ans) % 6;
  const clean = ans.replace(/^[a-fก-ฉ][).:]\s*/, "");
  for (let i = 0; i < choices.length; i++) {
    const text = normalize(choices[i]).replace(/^[a-fก-ฉ][).:]\s*/, "");
    if (text === ans || text === clean) return i;
  }
  if (letterHit >= 0 && letterHit < choices.length && /^[a-fก-ฉ]$/.test(ans)) return letterHit;
  const asNum = Number(ans);
  if (Number.isInteger(asNum) && asNum >= 1 && asNum <= choices.length) return asNum - 1;
  return null;
};

export default function QuizPage() {
  const [docs, setDocs] = useState<LocalDoc[]>([]);
  const [docId, setDocId] = useState("");
  const [topic, setTopic] = useState("");
  const [items, setItems] = useState<QuizItem[] | null>(null);
  const [rawFallback, setRawFallback] = useState("");
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
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
    if (!topic.trim() || !docId) return;
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return;
    setBusy(true);
    setError("");
    setNeedsLogin(false);
    setItems(null);
    setRawFallback("");
    setPicked([]);
    setRevealed([]);
    try {
      const hits = searchLocal(doc.chunks as LocalChunk[], topic.trim(), 8);
      if (hits.length === 0) {
        setError("ไม่พบเนื้อหาที่ตรงในเอกสารที่เลือก ลองเปลี่ยนคำค้น");
        return;
      }
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          type: "MCQ",
          n: 5,
          context: hits.map((h) => ({ content: h.content, page: h.page, file: doc.filename })),
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const friendly = friendlyApiError(
          response.status,
          data,
          "ไม่สามารถสร้างแบบทดสอบได้ กรุณาลองอีกครั้ง"
        );
        setError(friendly.text);
        setNeedsLogin(friendly.needsLogin);
        return;
      }
      const quiz =
        typeof data === "object" && data !== null && "quiz" in data
          ? (data as { quiz: unknown }).quiz
          : null;
      if (Array.isArray(quiz) && quiz.every((q) => typeof q === "object" && q !== null)) {
        const list = quiz as QuizItem[];
        setItems(list);
        setPicked(list.map(() => null));
        setRevealed(list.map(() => false));
      } else {
        setRawFallback(JSON.stringify(data, null, 2));
      }
    } catch {
      setError("เชื่อมต่อระบบสร้างแบบทดสอบไม่ได้ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  const correctCount =
    items?.filter((item, i) => {
      const ai = answerIndex(item);
      return ai !== null && picked[i] === ai;
    }).length ?? 0;
  const answeredCount = picked.filter((p) => p !== null).length;

  return (
    <main className="page-container narrow">
      <p className="eyebrow">ทบทวนความเข้าใจ</p>
      <h1 className="page-title">สร้างแบบทดสอบ</h1>
      <p className="page-description">เลือกเอกสาร ระบุหัวข้อ แล้วรับแบบทดสอบปรนัย 5 ข้อจากเนื้อหาในเครื่อง</p>
      <section className="panel">
        {docs.length === 0 ? (
          <div className="answer-box">
            <h2>ยังไม่มีเอกสารในเครื่อง</h2>
            <p className="muted-text">เพิ่มไฟล์ PDF ก่อน แล้วกลับมาสร้างแบบทดสอบได้เลย</p>
            <Link className="button" href="/upload">เพิ่มเอกสาร</Link>
          </div>
        ) : (
        <form className="form-stack" onSubmit={send}>
          <label className="field-label" htmlFor="quiz-doc">
            เอกสารที่ใช้ออกข้อสอบ
            <select
              className="select-input"
              id="quiz-doc"
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
        {items && items.length > 0 && (
          <div aria-live="polite">
            <p className="quiz-score">
              ตอบแล้ว {answeredCount}/{items.length} ข้อ · ถูก {correctCount} ข้อ
            </p>
            <ol className="quiz-list">
              {items.map((item, i) => {
                const choices = Array.isArray(item.choices) ? item.choices : [];
                const ai = answerIndex(item);
                const showAnswer = revealed[i];
                if (!item.question) {
                  return (
                    <li className="quiz-item" key={i}>
                      <pre className="answer-text" style={{ overflowX: "auto" }}>
                        {item.raw ? toText(item.raw) : JSON.stringify(item, null, 2)}
                      </pre>
                    </li>
                  );
                }
                return (
                  <li className="quiz-item" key={i}>
                    <p className="quiz-question">
                      <strong>ข้อ {i + 1}</strong> {item.question}
                    </p>
                    {choices.length > 0 ? (
                      <div className="quiz-choices" role="group" aria-label={`ตัวเลือกข้อ ${i + 1}`}>
                        {choices.map((choice, ci) => {
                          const isAnswer = ai === ci;
                          const isPicked = picked[i] === ci;
                          const cls = [
                            "quiz-choice",
                            isPicked ? "picked" : "",
                            showAnswer && isAnswer ? "correct" : "",
                            showAnswer && isPicked && !isAnswer ? "wrong" : "",
                          ]
                            .filter(Boolean)
                            .join(" ");
                          return (
                            <button
                              className={cls}
                              key={ci}
                              type="button"
                              onClick={() =>
                                setPicked((prev) => prev.map((p, pi) => (pi === i ? ci : p)))
                              }
                            >
                              {toText(choice)}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="muted-text">({item.type ?? "อัตนัย"}) ลองตอบในใจแล้วกดดูเฉลย</p>
                    )}
                    <button
                      className="button-secondary button-small"
                      type="button"
                      onClick={() =>
                        setRevealed((prev) => prev.map((r, ri) => (ri === i ? !r : r)))
                      }
                    >
                      {showAnswer ? "ซ่อนเฉลย" : "ดูเฉลย"}
                    </button>
                    {showAnswer && (
                      <div className="quiz-answer">
                        <p>
                          <strong>เฉลย:</strong>{" "}
                          {ai !== null && choices[ai] !== undefined
                            ? toText(choices[ai])
                            : toText(item.answer)}
                        </p>
                        {item.explanation && (
                          <p>
                            <strong>เหตุผล:</strong> {item.explanation}
                          </p>
                        )}
                        {item.citation !== undefined && (
                          <p className="muted-text">
                            <strong>อ้างอิง:</strong> {toText(item.citation)}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        {rawFallback && (
          <div className="answer-box" aria-live="polite">
            <h2>แบบทดสอบของคุณ</h2>
            <pre className="answer-text" style={{ overflowX: "auto", fontFamily: "inherit" }}>
              {rawFallback}
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}
