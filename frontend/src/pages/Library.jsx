import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getLibrary } from "../api/endpoints";

export default function Library() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getLibrary()
      .then((res) => setWords(res.data))
      .catch(() => setError("Kelimeler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = words.filter((uw) => {
    if (filter === "learning") return uw.score > 0 && uw.score < 10;
    if (filter === "mastered") return uw.score === 10;
    if (filter === "struggling") return uw.score < 0;
    return true;
  });

  const scoreColor = (score) => {
    if (score < 0) return "var(--danger)";
    if (score === 0) return "var(--text-muted)";
    if (score < 5) return "var(--warning)";
    if (score < 10) return "#60a5fa";
    return "var(--success)";
  };

  const scoreLabel = (score) => {
    if (score < 0) return "Zor";
    if (score === 0) return "Yeni";
    if (score < 5) return "Öğreniliyor";
    if (score < 10) return "İyi";
    return "Öğrenildi ✓";
  };

  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="loading" style={{ color: "var(--danger)" }}>{error}</div>;

  return (
    <div className="lib-page">
      <div className="lib-header">
        <div>
          <Link to="/" className="wl-back">← Ana sayfa</Link>
          <h1 style={{ marginTop: "0.5rem" }}>Kelime Kitaplığı</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            {words.length} kelime
          </p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="lib-filters">
        {[
          { key: "all", label: "Tümü" },
          { key: "struggling", label: "😕 Zor" },
          { key: "learning", label: "📈 Öğreniliyor" },
          { key: "mastered", label: "✅ Öğrenildi" },
        ].map((f) => (
          <button
            key={f.key}
            className={`lib-filter-btn ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="lib-empty">
          <p>Bu kategoride henüz kelime yok.</p>
          <Link to="/word-learn" className="wl-done-btn primary" style={{ marginTop: "1rem", display: "inline-block" }}>
            Word Learn'e git
          </Link>
        </div>
      ) : (
        <div className="lib-list">
          {filtered.map((uw) => (
            <div key={uw.id} className="lib-item">
              <div className="lib-item-left">
                <span className="lib-english">{uw.word.english}</span>
                <span className="lib-turkish">{uw.word.turkish}</span>
              </div>
              <div className="lib-item-right">
                <span className="lib-score" style={{ color: scoreColor(uw.score) }}>
                  {uw.score}/10
                </span>
                <span className="lib-label" style={{ color: scoreColor(uw.score) }}>
                  {scoreLabel(uw.score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}