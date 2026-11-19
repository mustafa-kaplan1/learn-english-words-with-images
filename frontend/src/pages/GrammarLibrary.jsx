import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getGrammarLibrary } from "../api/endpoints";
import "../styles/grammar.css";

const STAGE_FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "unknown", label: "Bilmediğim (≤0)" },
  { key: "learning", label: "Öğrendiğim (1-5)" },
  { key: "good", label: "İyi Bildiğim (6-9)" },
  { key: "mastered", label: "Tamamlandı (10)" },
];

export default function GrammarLibrary() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("ALL");

  useEffect(() => {
    getGrammarLibrary()
      .then((res) => {
        setData(res.data);
      })
      .catch(() => setError("Gramer kitaplığı yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Kitaplık yükleniyor...</div>;
  if (error) return <div className="loading" style={{ color: "var(--danger)" }}>{error}</div>;

  const { counts, level_stats, topics } = data;

  const filteredTopics = topics.filter((t) => {
    const matchesStage = activeFilter === "all" || t.stage === activeFilter;
    const matchesLevel = selectedLevel === "ALL" || t.level === selectedLevel;
    return matchesStage && matchesLevel;
  });

  return (
    <div className="gm-page">
      <div className="gm-header">
        <Link to="/" className="wl-back">← Ana sayfa</Link>
        <h1>Gramer Kitaplığı</h1>
        <p className="gm-subtitle">
          Tüm gramer konularındaki seviyen, puanların ve tamamlanma durumun.
        </p>
      </div>

      <div className="wl-done-stats-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="wl-stat-card" style={{ borderTop: "3px solid #64748b" }}>
          <div className="wl-stat-num">{counts.all}</div>
          <div className="wl-stat-label">Toplam Konu</div>
          <div className="wl-stat-desc">84 Modül</div>
        </div>

        <div className="wl-stat-card wl-stat-known">
          <div className="wl-stat-num">{counts.mastered}</div>
          <div className="wl-stat-label">Tamamlanan</div>
          <div className="wl-stat-desc">10 Puan</div>
        </div>

        <div className="wl-stat-card" style={{ borderTop: "3px solid #3b82f6" }}>
          <div className="wl-stat-num" style={{ color: "#93c5fd" }}>{counts.good}</div>
          <div className="wl-stat-label">İyi Bildiğim</div>
          <div className="wl-stat-desc">6-9 Puan</div>
        </div>

        <div className="wl-stat-card wl-stat-unsure">
          <div className="wl-stat-num">{counts.learning}</div>
          <div className="wl-stat-label">Öğrendiğim</div>
          <div className="wl-stat-desc">1-5 Puan</div>
        </div>
      </div>

      <div className="gm-controls" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.8rem" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)" }}>
          SEVİYE BAZLI TAMAMLANMA:
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.8rem" }}>
          {Object.entries(level_stats).map(([lvl, stat]) => {
            const pct = stat.total > 0 ? Math.round((stat.mastered / stat.total) * 100) : 0;
            return (
              <div key={lvl} style={{ background: "var(--bg)", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  <span>{lvl}</span>
                  <span style={{ color: "var(--text-muted)" }}>%{pct}</span>
                </div>
                <div className="wl-stat-bar" style={{ margin: 0 }}>
                  <div style={{ width: `${pct}%`, background: "var(--accent)" }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="wl-done-tabs" style={{ marginBottom: "1rem" }}>
        {STAGE_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`wl-tab-btn ${activeFilter === f.key ? "active" : ""}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label} ({f.key === "all" ? counts.all : counts[f.key]})
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {filteredTopics.map((t) => (
          <div
            key={t.id}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "0.9rem 1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                <span className="gm-code-badge">{t.code}</span>
                <span className={`gm-level-badge gm-lvl-${t.level}`}>{t.level}</span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>{t.title}</span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {t.turkish_description}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 800 }}>{t.score} / 10</div>
                <span className={`gm-score-pill gm-stage-${t.stage}`} style={{ fontSize: "0.72rem" }}>
                  {t.stage === "unknown" && "Bilmediğim"}
                  {t.stage === "learning" && "Öğrendiğim"}
                  {t.stage === "good" && "İyi Bildiğim"}
                  {t.stage === "mastered" && "Tamamlandı"}
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredTopics.length === 0 && (
          <div className="wl-done-empty">Bu filtreye uygun konu bulunamadı.</div>
        )}
      </div>
    </div>
  );
}