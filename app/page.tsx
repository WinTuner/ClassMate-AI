export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>ClassMate AI</h1>
      <ul>
        <li><a href="/login">/login</a></li>
        <li><a href="/upload">/upload</a></li>
        <li><a href="/chat">/chat</a></li>
        <li><a href="/quiz">/quiz</a></li>
        <li><a href="/status">/status (Server Component + ข้อมูลจริง)</a></li>
        <li><a href="/documents">/documents (Server Component + ข้อมูลจริง)</a></li>
      </ul>
      <p>เพื่อน frontend มาทำต่อได้เลย API ดูใน README</p>
    </main>
  );
}
