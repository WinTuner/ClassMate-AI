// แปล API error เป็นข้อความไทย — ใช้ทุกหน้าที่เรียก /api/*
// เหตุผล: API ตอบ error เป็นโค้ดสั้นๆ ภาษาอังกฤษ ("unauthorized") ให้ helper นี้
// แปลงเป็นประโยคไทยพร้อมบอกว่าต้อง login ใหม่มั้ย (401 = session หมด/ยังไม่ login)
export function friendlyApiError(
  status: number,
  data: unknown,
  fallback: string
): { text: string; needsLogin: boolean } {
  if (status === 401 || status === 403) {
    return {
      text: "กรุณาเข้าสู่ระบบก่อนใช้งาน — session หมดอายุหรือยังไม่ได้ login",
      needsLogin: true,
    };
  }
  const detail =
    typeof data === "object" && data !== null && "error" in data
      ? String((data as { error: unknown }).error)
      : "";
  if (detail && detail !== "unauthorized") return { text: detail, needsLogin: false };
  return { text: fallback, needsLogin: false };
}
