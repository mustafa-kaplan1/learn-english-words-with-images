import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getLibrary } from "../api/endpoints";

const FILTERS = [
  { key: "all", label: "Tümü", check: () => true },
  { key: "unknown", label: "Bilmediğim", desc: "≤ 0", check: (uw) => uw.score <= 0 },
  { key: "learning", label: "Öğrendiğim", desc: "1–5", check: (uw) => uw.score >= 1 && uw.score <= 5 },
  { key: "good", label: "İyi Bildiğim", desc: "6–9", check: (uw) => uw.score >= 6 && uw.score <= 9 },
  { key: "mastered", label: "Tamamlandı", desc: "10", check: (uw) => uw.score === 10 },
];

const SET_SIZES = [8, 16, 24, 32];

const scoreColor = (score) => {
  if (score <= 0) return "var(--danger)";
  if (score <= 5) return "var(--warning)";
  if (score <= 9) return "#60a5fa";
  return "var(--success)";
};

const scoreStage = (score) => {
  if (score <= 0) return "Bilmediğim";
  if (score <= 5) return "Öğrendiğim";
  if (score <= 9) return "İyi Bildiğim";
  return "Tamamlandı ✓";
};

export default function Library() {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set(["all"]));
  const [showModal, setShowModal] = useState(false);
  const [setSize, setSetSize] = useState(null);

  useEffect(() => {
    getLibrary()
      .then((res) => setWords(res.data))
      .catch(() => setError("Kelimeler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const toggleFilter = (key) => {
    if (key === "all") { setSelected(new Set(["all"])); return; }
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete("all");
      if (next.has(key)) { next.delete(key); if (next.size === 0) next.add("all"); }
      else next.add(key);
      return next;
    });
  };

  const isAllSelected = selected.has("all");

  const filtered = isAllSelected
    ? words
    : words.filter((uw) =>
        FILTERS.filter((f) => f.key !== "all" && selected.has(f.key)).some((f) => f.check(uw))
      );

  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, words.filter(f.check).length]));

  const selectedLabels = isAllSelected
    ? "Tüm kelimeler"
    : FILTERS.filter((f) => selected.has(f.key)).map((f) => f.label).join(" + ");

  const handleStartSet = () => {
    if (filtered.length === 0) return;
    setSetSize(null);
    setShowModal(true);
  };

  const handleConfirm = () => {
    if (!setSize) return;
    const pool = [...filtered].sort(() => Math.random() - 0.5);
    const chosen = setSize === "all" ? pool : pool.slice(0, setSize);
    sessionStorage.setItem("customSet", JSON.stringify(chosen.map((uw) => uw.word)));
    setShowModal(false);
    navigate("/word-learn?mode=custom");
  };

  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="loading" style={{ color: "var(--danger)" }}>{error}</div>;

  return (
    <div className="lib-page">
      <div className="lib-header">
        <Link to="/" className="wl-back">← Ana sayfa</Link>
        <h1 style={{ marginTop: "0.5rem" }}>Kelime Kitaplığı</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
          Toplam {words.length} kelime
        </p>
      </div>

      <div className="lib-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`lib-filter-btn ${selected.has(f.key) ? "active" : ""}`}
            onClick={() => toggleFilter(f.key)}
          >
            <span>{f.label}{f.desc ? ` (${f.desc})` : ""}</span>
            <span className="lib-filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="lib-result-bar">
        <p className="lib-result-count">{selectedLabels} — {filtered.length} kelime</p>
        {filtered.length > 0 && (
          <button className="lib-set-btn" onClick={handleStartSet}>Set oluştur →</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="lib-empty">
          <p>Bu kategoride henüz kelime yok.</p>
          <Link to="/word-learn" className="wl-done-btn primary"
            style={{ marginTop: "1rem", display: "inline-block" }}>
            Word Learn'e git
          </Link>
        </div>
      ) : (
        <div className="lib-list">
          {filtered.map((uw) => (
            <div key={uw.id} className="lib-item">
              <div className="lib-item-left">
                <span className="lib-english">{uw.word.english}</span>
                <span className="lib-turkish">
                  {Array.isArray(uw.word.turkish)
                    ? uw.word.turkish.join(", ")
                    : uw.word.turkish}
                </span>
              </div>
              <div className="lib-item-right">
                <span className="lib-score" style={{ color: scoreColor(uw.score) }}>
                  {uw.score}/10
                </span>
                <span className="lib-label" style={{ color: scoreColor(uw.score) }}>
                  {scoreStage(uw.score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Kaç kelimelik set?</h2>
            <p className="modal-sub">Havuzda {filtered.length} kelime var.</p>
            <div className="modal-sizes">
              {SET_SIZES.map((size) => {
                const disabled = filtered.length < size;
                return (
                  <button
                    key={size}
                    className={`modal-size-btn ${setSize === size ? "active" : ""} ${disabled ? "disabled" : ""}`}
                    onClick={() => !disabled && setSetSize(size)}
                    disabled={disabled}
                  >
                    {size}
                    {disabled && <span className="modal-size-sub">yetersiz</span>}
                  </button>
                );
              })}
              <button
                className={`modal-size-btn modal-size-all ${setSize === "all" ? "active" : ""}`}
                onClick={() => setSetSize("all")}
              >
                Hepsi
                <span className="modal-size-sub">{filtered.length} kelime</span>
              </button>
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: "1.5rem" }}
              onClick={handleConfirm}
              disabled={!setSize}
            >
              Çalışmaya başla
            </button>
            <button className="modal-cancel" onClick={() => setShowModal(false)}>İptal</button>
          </div>
        </div>
      )}
    </div>
  );
}