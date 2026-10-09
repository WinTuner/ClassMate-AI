// Client Component — เหตุผล: ปุ่มลบต้องยิง DELETE + refresh รายการแบบทันที
// (useState/useRouter) เป็น interactive จึงแยกเป็น client ฝังในหน้า Server
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteDocButton({ id, filename }: { id: string; filename: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const remove = async () => {
    if (!window.confirm(`ลบ "${filename}" ออกจากคลัง? (chunks ที่ฝังไว้ลบตามด้วย)`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        const detail =
          typeof data === "object" && data !== null && "error" in data
            ? String(data.error)
            : "ลบไม่สำเร็จ";
        window.alert(`ลบไม่ได้: ${detail}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className="button-secondary button-small button"
      type="button"
      onClick={remove}
      disabled={busy}
    >
      {busy ? "กำลังลบ..." : "ลบ"}
    </button>
  );
}
