"use client";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

// แชทไป POST /api/chat
export default function ChatPage() {
  const { name } = useAuth();
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const send = async () => {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    setA(JSON.stringify(await r.json(), null, 2));
  };
  return (
    <main style={{ padding: 24 }}>
      <h2>Chat {name ? `— ${name}` : ""}</h2>
      <input style={{ width: 400 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ถามจากสไลด์..." />
      <button onClick={send}>ส่ง</button>
      <pre>{a}</pre>
    </main>
  );
}
