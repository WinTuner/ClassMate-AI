// Local RAG (TF-IDF) — ค้นในเอกสารฝั่ง browser 100% ไม่ส่งข้อความไปไหน
// เหตุผลที่ TF-IDF แทน embeddings: ไม่ต้องโหลดโมเดล ~100MB, ไม่เรียก API ภายนอก,
// ไฟล์ PDF ทั้งก้อนอยู่แค่ในเครื่อง user (privacy by design)

export type LocalChunk = { page: number; content: string };
export type ScoredChunk = LocalChunk & { score: number };

// ตัดคำแบบหยาบรองรับไทย (ไทยไม่มี space → ทั้งประโยคคือ 1 term + ใช้ substring นับ)
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s.,;:!?(){}\[\]"'“”‘’«»…—–\-।|/\\@#$%^&*+=~`<>()]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

// คืน top-K chunks ที่มี score > 0 พร้อมเลขหน้าจริงจากตอน parse
export function searchLocal(
  chunks: LocalChunk[],
  query: string,
  topK = 5
): ScoredChunk[] {
  const terms = tokenize(query);
  if (terms.length === 0 || chunks.length === 0) return [];

  const lowered = chunks.map((c) => c.content.toLowerCase());
  // df ต่อ term (นับ chunk ที่มี term ปรากฏ)
  const df = terms.map(
    (t) => lowered.filter((c) => c.includes(t)).length
  );
  const N = chunks.length;

  return chunks
    .map((c, i) => {
      let score = 0;
      terms.forEach((t, ti) => {
        const tf = countOccurrences(lowered[i], t);
        if (tf === 0) return;
        const idf = Math.log((N + 1) / (df[ti] + 1)) + 1;
        score += tf * idf;
      });
      return { ...c, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// แบ่งข้อความเป็นชิ้นพร้อมเลขหน้า (รับ chunks รายหน้าแล้วตัดชิ้นยาว)
export function chunkPages(
  pages: { page: number; text: string }[],
  size = 1000,
  overlap = 200
): LocalChunk[] {
  const out: LocalChunk[] = [];
  for (const p of pages) {
    const text = p.text.replace(/\s+/g, " ").trim();
    if (text.length < 50) continue;
    if (text.length <= size) {
      out.push({ page: p.page, content: text });
      continue;
    }
    let i = 0;
    while (i < text.length) {
      const slice = text.slice(i, i + size).trim();
      if (slice.length > 50) out.push({ page: p.page, content: slice });
      i += size - overlap;
    }
  }
  return out;
}
