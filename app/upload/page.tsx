"use client";
import { useState } from "react";

// หน้ากากๆ — อัปโหลด PDF ไป POST /api/ingest
export default function UploadPage() {
  const [msg, setMsg] = useState("");
  const send = async (f: File) => {
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/ingest", { method: "POST", body: fd });
    setMsg(JSON.stringify(await r.json()));
  };
  return (
    <main style={{ padding: 24 }}>
      <h2>Upload PDF (กากๆ)</h2>
      <input type="file" accept="application/pdf" onChange={(e) => e.target.files && send(e.target.files[0])} />
      <pre>{msg}</pre>
    </main>
  );
}
