export type ValidateResult = { ok: true; sizeMB: number } | { ok: false; reason: string };

const MAX_MB = Number(process.env.MAX_PDF_MB ?? 20);

export function validatePdfBuffer(buf: Buffer, mime: string): ValidateResult {
  const sizeMB = buf.length / 1024 / 1024;
  if (mime !== "application/pdf") return { ok: false, reason: "ชนิดไฟล์ไม่ใช่ PDF" };
  if (sizeMB > MAX_MB) return { ok: false, reason: `ไฟล์ใหญ่เกิน ${MAX_MB}MB` };
  if (buf.length < 5 || buf.subarray(0, 5).toString() !== "%PDF-")
    return { ok: false, reason: "header ไม่ใช่ %PDF- ไฟล์อาจเสีย/ปลอมนามสกุล" };
  if (!buf.includes(Buffer.from("%%EOF")))
    return { ok: false, reason: "ไม่พบ %%EOF ไฟล์อาจโหลดไม่สมบูรณ์" };
  return { ok: true, sizeMB };
}
