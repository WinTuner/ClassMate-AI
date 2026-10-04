"use client";
import { useState } from "react";

// POST /api/quiz
export default function QuizPage() {
  const [topic, setTopic] = useState("");
  const [out, setOut] = useState("");
  const send = async () => {
    const r = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, type: "MCQ", n: 5 }),
    });
    setOut(JSON.stringify(await r.json(), null, 2));
  };
  return (
    <main style={{ padding: 24 }}>
      <h2>Quiz</h2>
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="หัวข้อ..." />
      <button onClick={send}>สร้าง</button>
      <pre>{out}</pre>
    </main>
  );
}
