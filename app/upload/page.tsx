// Client Component — ทั้งหน้าทำงานใน browser 100%: อ่านไฟล์ PDF ด้วย PDF.js,
// แตกข้อความรายหน้า, ตัดชิ้น, เก็บลง IndexedDB — ไฟล์ไม่ออกจากเครื่องเลย
"use client";
import { useState } from "react";
import Link from "next/link";
import { chunkPages } from "@/lib/local-rag";
import { saveDoc, findDuplicateName } from "@/lib/local-docs";

const WORKER = "https://unpkg.com/pdfjs-dist@6.4.299/build/pdf.worker.min.mjs";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!file) {
      setMessage("กรุณาเลือกไฟล์ PDF ก่อน");
      setIsError(true);
      return;
    }
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      // 1. validate เบื้องต้นในเครื่อง (ชนิด + header %PDF)
      const buf = new Uint8Array(await file.arrayBuffer());
      const head = new TextDecoder().decode(buf.slice(0, 5));
      if (file.type !== "application/pdf" || head !== "%PDF-") {
        setMessage("ไฟล์นี้ไม่ใช่ PDF ที่ถูกต้อง");
        setIsError(true);
        return;
      }
      // 2. กันชื่อซ้ำในคลังเครื่องนี้
      if (await findDuplicateName(file.name)) {
        setMessage(`ไฟล์ "${file.name}" อยู่ในคลังแล้ว ไม่ต้องเพิ่มซ้ำ`);
        setIsError(true);
        return;
      }
      // 3. parse รายหน้าใน browser
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER;
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const pages: { page: number; text: string }[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        const text = (tc.items as { str?: string }[])
          .map((it) => it.str ?? "")
          .join(" ");
        pages.push({ page: i, text });
      }
      const chunks = chunkPages(pages);
      if (chunks.length === 0) {
        setMessage("ดึงข้อความไม่ได้ (สแกนภาพล้วน?) เลือกไฟล์ที่มี text layer");
        setIsError(true);
        return;
      }
      // 4. เก็บลงเครื่อง (IndexedDB) — ไม่ส่งไป server
      await saveDoc({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filename: file.name,
        pages: pdf.numPages,
        chunks,
        createdAt: Date.now(),
      });
      setMessage(`บันทึก "${file.name}" ลงเครื่องแล้ว (${pdf.numPages} หน้า) ถามได้เลยที่หน้าแชท`);
      setFile(null);
      const input = document.getElementById("pdf-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch {
      setMessage("อ่านไฟล์ไม่ได้ กรุณาลองไฟล์อื่น");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page-container narrow">
      <p className="eyebrow">เริ่มต้นการเรียน</p>
      <h1 className="page-title">เพิ่มเอกสารของคุณ</h1>
      <p className="page-description">
        ไฟล์อยู่ในเครื่องคุณเท่านั้น — ระบบอ่านและเก็บใน browser ไม่ส่งไป server
      </p>
      <section className="panel">
        <div className="form-stack">
          <label className="file-drop" htmlFor="pdf-file">
            <span>
              <strong>{file ? file.name : "เลือกไฟล์ PDF จากอุปกรณ์"}</strong>
              <br />
              <span className="form-help">อ่านในเครื่อง ไม่มีการอัปโหลด</span>
            </span>
            <input
              id="pdf-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setMessage("");
              }}
            />
          </label>
          <button className="button" type="button" onClick={send} disabled={!file || busy}>
            {busy ? "กำลังอ่านไฟล์ในเครื่อง..." : "เพิ่มเข้าคลังในเครื่อง"}
          </button>
        </div>
        {message && (
          <p className={`notice${isError ? " error" : ""}`} role={isError ? "alert" : "status"}>
            {message}
            {!isError && (
              <>
                {" "}
                <Link href="/chat">ไปถาม AI</Link>
              </>
            )}
          </p>
        )}
      </section>
    </main>
  );
}
