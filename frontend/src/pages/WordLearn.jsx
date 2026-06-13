import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getWordSession, updateScore, getWordImages } from "../api/endpoints";

export default function WordLearn() {
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionDone, setSessionDone] = useState(false);

  // Oturumu başlat
  useEffect(() => {
    getWordSession()
      .then((res) => setWords(res.data))
      .catch(() => setError("Kelimeler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  // Kart çevrilince görselleri çek
  useEffect(() => {
    if (!flipped || !words[index]) return;
    setImages([]);
    setLoadingImages(true);
    getWordImages(words[index].id)
      .then((res) => setImages(res.data.images || []))
      .catch(() => setImages([]))
      .finally(() => setLoadingImages(false));
  }, [flipped, index]);

  const handleScore = async (action) => {
    const word = words[index];
    // Arka planda puan gönder, kullanıcıyı beklettme
    updateScore(word.id, action).catch(() => {});

    // Sonraki karta geç
    if (index + 1 >= words.length) {
      setSessionDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
      setImages([]);
    }
  };

  if (loading) return <div className="loading">Kelimeler yükleniyor...</div>;
  if (error) return <div className="loading" style={{ color: "var(--danger)" }}>{error}</div>;
  if (sessionDone) return <SessionDone total={words.length} />;

  const word = words[index];

  return (
    <div className="wl-page">
      <div className="wl-header">
        <Link to="/" className="wl-back">← Ana sayfa</Link>
        <span className="wl-progress">{index + 1} / {words.length}</span>
      </div>

      {/* Progress bar */}
      <div className="wl-bar">
        <div className="wl-bar-fill" style={{ width: `${((index + 1) / words.length) * 100}%` }} />
      </div>

      {/* Kart */}
      <div className={`wl-card ${flipped ? "flipped" : ""}`} onClick={() => !flipped && setFlipped(true)}>
        <div className="wl-card-inner">
          {/* Ön yüz */}
          <div className="wl-front">
            <p className="wl-hint">Karta tıkla →</p>
            <h2 className="wl-word">{word.english}</h2>
            <span className="wl-badge">{word.part_of_speech}</span>
          </div>

          {/* Arka yüz */}
          <div className="wl-back-face">
            <h3 className="wl-turkish">{word.turkish}</h3>
            <div className="wl-images">
              {loadingImages && <p className="wl-img-loading">Görseller yükleniyor...</p>}
              {images.map((url, i) => (
                <img key={i} src={url} alt={word.english} className="wl-img" />
              ))}
              {!loadingImages && images.length === 0 && (
                <p className="wl-img-loading">Görsel bulunamadı.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Puanlama butonları */}
      {flipped && (
        <div className="wl-buttons">
          <button className="wl-btn wl-dont" onClick={() => handleScore("dont_know")}>
            😕 Bilmiyorum
          </button>
          <button className="wl-btn wl-unsure" onClick={() => handleScore("unsure")}>
            🤔 Emin değilim
          </button>
          <button className="wl-btn wl-know" onClick={() => handleScore("know")}>
            ✅ Biliyorum
          </button>
        </div>
      )}
    </div>
  );
}

function SessionDone({ total }) {
  return (
    <div className="wl-done">
      <h2>🎉 Oturum tamamlandı!</h2>
      <p>{total} kelimeyi gözden geçirdin.</p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
        <Link to="/word-learn" className="wl-done-btn primary"
          onClick={() => window.location.reload()}>
          Tekrar başlat
        </Link>
        <Link to="/" className="wl-done-btn">Ana sayfa</Link>
      </div>
    </div>
  );
}