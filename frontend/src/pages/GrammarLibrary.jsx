import { Link } from "react-router-dom";
export default function GrammarLibrary() {
  return (
    <div style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <Link to="/" style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>← Ana sayfa</Link>
      <h1 style={{ marginTop: "1rem" }}>Gramer Kitaplığı</h1>
      <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>İçerik yakında eklenecek.</p>
    </div>
  );
}