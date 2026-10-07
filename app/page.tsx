import Link from "next/link";

export default function Home() {
  return (
    <main className="page-container">
      <section className="hero-panel">
        <p className="eyebrow">Your personal study space</p>
        <h1>เรียนรู้ได้ลึกขึ้น<br />ในแบบของคุณ</h1>
        <p>
          รวมเอกสารการเรียนไว้ที่เดียว ถาม AI จากเนื้อหาจริง
          และทบทวนความเข้าใจด้วยแบบทดสอบส่วนตัว
        </p>
        <Link className="button button-light" href="/upload">เริ่มจากอัปโหลดเอกสาร</Link>
      </section>

      <section aria-labelledby="study-tools-title">
        <div className="section-heading">
          <div>
            <h2 id="study-tools-title">เครื่องมือช่วยเรียน</h2>
            <p>เลือกสิ่งที่อยากทำ แล้วเริ่มเรียนได้เลย</p>
          </div>
        </div>
        <div className="card-grid">
          <Link className="feature-card" href="/upload">
            <span className="feature-icon">PDF</span>
            <h3>เพิ่มเอกสารเรียน</h3>
            <p>อัปโหลด PDF เพื่อให้ ClassMate AI ใช้เป็นแหล่งข้อมูลอ้างอิง</p>
            <span className="feature-arrow">อัปโหลดเอกสาร →</span>
          </Link>
          <Link className="feature-card" href="/chat">
            <span className="feature-icon">AI</span>
            <h3>ถามจากเอกสาร</h3>
            <p>ถามคำถามและรับคำตอบพร้อมแหล่งอ้างอิงจากเอกสารของคุณ</p>
            <span className="feature-arrow">เริ่มสนทนา →</span>
          </Link>
          <Link className="feature-card" href="/quiz">
            <span className="feature-icon">QZ</span>
            <h3>ฝึกทำแบบทดสอบ</h3>
            <p>สร้างแบบทดสอบเพื่อทบทวนหัวข้อที่กำลังเรียน</p>
            <span className="feature-arrow">สร้างแบบทดสอบ →</span>
          </Link>
        </div>
      </section>

      <footer className="footer-note">
        <Link href="/status">สถานะระบบ</Link>
        <span> · </span>
        <Link href="/documents">ดูเอกสารทั้งหมด</Link>
      </footer>
    </main>
  );
}
