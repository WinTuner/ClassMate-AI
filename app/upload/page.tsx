// Client Component — เหตุผล: ต้องอ่าน File object จาก <input type="file"> ฝั่ง
// browser + ส่ง FormData ไป POST /api/ingest + โชว์สถานะอัปโหลด ไม่มีอะไรให้
// render ล่วงหน้าบน server จึงเป็น client
"use client";
import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!file) {
      setMessage("กรุณาเลือกไฟล์ PDF ก่อนอัปโหลด");
      setIsError(true);
      return;
    }
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/ingest", { method: "POST", body: formData });
      const result: unknown = await response.json();
      if (!response.ok) {
        const detail =
          typeof result === "object" && result !== null && "error" in result
            ? String(result.error)
            : "เซิร์ฟเวอร์ไม่สามารถประมวลผลไฟล์ได้";
        setMessage(detail);
        setIsError(true);
        return;
      }
      setMessage("อัปโหลดและส่งเอกสารให้ระบบประมวลผลแล้ว");
      setFile(null);
      const input = document.getElementById("pdf-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch {
      setMessage("เชื่อมต่อระบบอัปโหลดไม่ได้ กรุณาลองอีกครั้ง");
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
        อัปโหลดสไลด์หรือเอกสาร PDF เพื่อถามคำถามและสร้างแบบทดสอบจากเนื้อหาของคุณ
      </p>
      <section className="panel">
        <div className="form-stack">
          <label className="file-drop" htmlFor="pdf-file">
            <span>
              <strong>{file ? file.name : "เลือกไฟล์ PDF จากอุปกรณ์"}</strong>
              <br />
              <span className="form-help">ระบบจะตรวจสอบชนิดไฟล์และเนื้อหาก่อนบันทึก</span>
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
            {busy ? "กำลังอัปโหลดและประมวลผล..." : "อัปโหลดเอกสาร"}
          </button>
        </div>
        {message && <p className={`notice${isError ? " error" : ""}`} role={isError ? "alert" : "status"}>{message}</p>}
      </section>
    </main>
  );
}
