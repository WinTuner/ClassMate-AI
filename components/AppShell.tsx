// Client Component — เหตุผล: เมนูต้องรู้ path ปัจจุบัน (usePathname) + ชื่อผู้ใช้
// จาก useAuth() เพื่อไฮไลต์เมนู active แบบทันที เป็น UI interactive จึงเป็น client
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const navigation = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/upload", label: "อัปโหลด" },
  { href: "/chat", label: "ถาม AI" },
  { href: "/quiz", label: "แบบทดสอบ" },
  { href: "/documents", label: "เอกสาร" },
  { href: "/status", label: "สถานะระบบ" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { name, email, loading } = useAuth();

  return (
    <>
      <header className="app-header">
        <Link className="brand" href="/" aria-label="ClassMate AI หน้าหลัก">
          <span className="brand-mark">CM</span>
          <span>ClassMate AI</span>
        </Link>
        <nav className="main-nav" aria-label="เมนูหลัก">
          {navigation.map((item) => (
            <Link
              className={`nav-link${pathname === item.href ? " active" : ""}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="header-account" href="/login">
          {loading ? "กำลังตรวจสอบ..." : name || email || "เข้าสู่ระบบ"}
        </Link>
      </header>
      {children}
    </>
  );
}
