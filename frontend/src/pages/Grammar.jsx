import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  getGrammarTopics,
  startGrammarSession,
  submitGrammarTranslation,
} from "../api/endpoints";
import "../styles/grammar.css";

const LEVELS = ["ALL", "A1", "A2", "B1", "B2", "C1"];
const QUESTION_COUNTS = [5, 8, 10, 15];

export default function Grammar() {
  const [mode, setMode] = useState("select"); // "select" | "practice" | "done"
  const [level, setLevel] = useState("ALL");
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Practice state
  const [questions, setQuestions] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userTranslation, setUserTranslation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const inputRef = useRef(null);

  // Konuları yükle
  useEffect(() => {
    setLoading(true);
    const param = level === "ALL" ? null : level;
    getGrammarTopics(param)
      .then((res) => {
        setTopics(res.data);
        setError("");
        // Eğer seçili konu yeni listede yoksa sıfırlama, varsa koru
      })
      .catch(() => setError("Konular yüklenirken hata oluştu."))
      .finally(() => setLoading(false));
  }, [level]);

  // Soru değiştiğinde input'a odaklan
  useEffect(() => {
    if (mode === "practice" && !evaluation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, mode, evaluation]);

  // Enter ile gönderme / sonraki soruya geçme
  useEffect(() => {
    if (mode !== "practice") return;

    const handleKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (evaluation) {
          e.preventDefault();
          handleNextQuestion();
        } else if (userTranslation.trim() && !submitting) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, evaluation, userTranslation, submitting, currentIndex, questions]);

  const handleStartSession = async (topicIdToStart) => {
    const targetId = topicIdToStart || selectedTopicId;
    if (!targetId) return;

    const chosenTopic = topics.find((t) => t.id === targetId);
    setCurrentTopic(chosenTopic);

    setLoading(true);
    setError("");
    try {
      const res = await startGrammarSession(targetId, questionCount);
      setQuestions(res.data.questions);
      setCurrentIndex(0);
      setUserTranslation("");
      setEvaluation(null);
      setSessionHistory([]);
      setMode("practice");
    } catch (err) {
      setError(err.response?.data?.detail || "Oturum başlatılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userTranslation.trim() || submitting) return;
    const currentQ = questions[currentIndex];
    setSubmitting(true);
    try {
      const res = await submitGrammarTranslation(
        currentQ.id,
        userTranslation.trim()
      );
      setEvaluation(res.data);
      setSessionHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          userTranslation: userTranslation.trim(),
          evaluation: res.data,
        },
      ]);
    } catch (err) {
      alert(err.response?.data?.detail || "Değerlendirme alınamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setMode("done");
    } else {
      setCurrentIndex((i) => i + 1);
      setUserTranslation("");
      setEvaluation(null);
    }
  };

  const getStageLabel = (stage) => {
    switch (stage) {
      case "unknown": return "Bilmediğim";
      case "learning": return "Öğrendiğim";
      case "good": return "İyi Bildiğim";
      case "mastered": return "Tamamlandı ✓";
      default: return "";
    }
  };

  const selectedTopicObj = topics.find((t) => t.id === selectedTopicId);

  /* ────────────────────────── 1. MOD: TEK KONU SEÇİMİ ────────────────────────── */
  if (mode === "select") {
    return (
      <div className="gm-page">
        <div className="gm-header">
          <Link to="/" className="wl-back">← Ana sayfa</Link>
          <h1>Gramer Konuları</h1>
          <p className="gm-subtitle">
            Çalışmak istediğin bir konuyu seç ve çeviri pratiğine başla.
          </p>
        </div>

        {/* Seviye Sekmeleri */}
        <div className="gm-tabs">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              className={`gm-tab-btn ${level === lvl ? "active" : ""}`}
              onClick={() => setLevel(lvl)}
            >
              {lvl === "ALL" ? "Tümü (84)" : lvl}
            </button>
          ))}
        </div>

        {/* Kontrol Çubuğu */}
        <div className="gm-controls">
          <div className="gm-controls-left">
            <span>
              {selectedTopicObj ? (
                <>Seçilen Konu: <strong>{selectedTopicObj.code} {selectedTopicObj.title}</strong></>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>Bir konu kartına tıklayın</span>
              )}
            </span>
          </div>

          <div className="gm-controls-right">
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Soru Sayısı:
            </span>
            <select
              className="gm-select-count"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            >
              {QUESTION_COUNTS.map((c) => (
                <option key={c} value={c}>{c} Soru</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* Konu Kartları */}
        {loading ? (
          <div className="loading">Konular yükleniyor...</div>
        ) : (
          <div className="gm-topics-grid">
            {topics.map((t) => {
              const isSelected = selectedTopicId === t.id;
              return (
                <div
                  key={t.id}
                  className={`gm-topic-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedTopicId(t.id)}
                >
                  <div className="gm-card-top">
                    <div className="gm-badge-group">
                      <span className="gm-code-badge">{t.code}</span>
                      <span className={`gm-level-badge gm-lvl-${t.level}`}>
                        {t.level}
                      </span>
                    </div>
                    <span style={{ fontSize: "1.1rem" }}>
                      {isSelected ? "🔘" : "⚪"}
                    </span>
                  </div>

                  <h3 className="gm-card-title">{t.title}</h3>
                  <p className="gm-card-desc">{t.turkish_description}</p>

                  <div className="gm-card-footer">
                    <span>Skor: {t.user_score} / 10</span>
                    <span className={`gm-score-pill gm-stage-${t.user_stage}`}>
                      {getStageLabel(t.user_stage)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Başlat Çubuğu */}
        <div className="gm-start-bar">
          <div>
            <div style={{ fontWeight: 700 }}>
              {selectedTopicObj
                ? `${selectedTopicObj.code} - ${selectedTopicObj.title}`
                : "Başlamak için yukarıdan bir konu seçin"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {selectedTopicObj
                ? `Yalnızca bu konuyu içeren, ${selectedTopicObj.level} seviyesine uygun ${questionCount} çeviri sorusu sorulacak.`
                : "Her oturum tek bir gramer kuralına odaklanır."}
            </div>
          </div>
          <button
            className="gm-start-btn"
            disabled={!selectedTopicId || loading}
            onClick={() => handleStartSession(selectedTopicId)}
          >
            {loading ? "Hazırlanıyor..." : "Oturumu Başlat ➔"}
          </button>
        </div>
      </div>
    );
  }

  /* ────────────────────────── 2. MOD: SADELEŞTİRİLMİŞ PRATİK EKRANI ────────────────────────── */
  if (mode === "practice") {
    const currentQ = questions[currentIndex];
    const isTrToEn = currentQ?.source_lang === "tr";
    const directionBadge = isTrToEn
      ? "🇹🇷 Türkçe ➔ 🇬🇧 İngilizce"
      : "🇬🇧 İngilizce ➔ 🇹🇷 Türkçe";

    return (
      <div className="gm-page">
        <div className="gm-practice-header">
          <button
            className="wl-back"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setMode("select")}
          >
            ← Konu Seçimine Dön
          </button>
          <span className="wl-progress">
            Soru {currentIndex + 1} / {questions.length}
          </span>
        </div>

        {/* İlerleme Çubuğu */}
        <div className="wl-bar">
          <div
            className="wl-bar-fill"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <div className="gm-practice-container">
          <div className="gm-practice-card">
            {/* Meta Bilgiler */}
            <div className="gm-question-meta">
              <span className="gm-lang-direction">{directionBadge}</span>
              <div className="gm-topics-tags">
                {currentTopic && (
                  <span className="gm-topic-tag">
                    {currentTopic.code} {currentTopic.title}
                  </span>
                )}
              </div>
            </div>

            {/* Soru Cümlesi */}
            <div className="gm-sentence-box">
              <p className="gm-sentence-text">{currentQ.question_text}</p>
            </div>

            {/* Çeviri Giriş Alanı */}
            <div className="gm-input-area">
              <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                {isTrToEn ? "İngilizce Çevirinizi Yazın:" : "Türkçe Çevirinizi Yazın:"}
              </label>
              <textarea
                ref={inputRef}
                className="gm-translation-input"
                placeholder={isTrToEn ? "İngilizce çeviriyi buraya yazın..." : "Türkçe çeviriyi buraya yazın..."}
                value={userTranslation}
                onChange={(e) => setUserTranslation(e.target.value)}
                disabled={submitting || !!evaluation}
              />

              {!evaluation && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    <kbd className="wl-inline-kbd">Enter</kbd> ile kontrol et
                  </span>
                  <button
                    className="gm-start-btn"
                    style={{ padding: "0.65rem 1.4rem", fontSize: "0.95rem" }}
                    onClick={handleSubmit}
                    disabled={!userTranslation.trim() || submitting}
                  >
                    {submitting ? "Değerlendiriliyor..." : "Kontrol Et ➔"}
                  </button>
                </div>
              )}
            </div>

            {/* Hızlı & Net Değerlendirme Kartı */}
            {evaluation && (
              <div className={`gm-feedback-card gm-fb-${evaluation.result}`}>
                <div className="gm-fb-header">
                  <div className="gm-fb-badge">
                    {evaluation.result === "correct" && "✅ Doğru! (+1 Puan)"}
                    {evaluation.result === "imperfect" && "🤔 Daha İyi Olabilir (-1 Puan)"}
                    {evaluation.result === "wrong" && "❌ Yanlış (-2 Puan)"}
                  </div>
                  {evaluation.new_scores?.length > 0 && (
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Skor: {evaluation.new_scores[0]?.score} / 10
                    </span>
                  )}
                </div>

                {/* Sadece Hata / Geliştirme durumunda açıklama ve Doğru Çeviri göster */}
                {evaluation.result !== "correct" ? (
                  <>
                    {evaluation.feedback && (
                      <p className="gm-fb-text">{evaluation.feedback}</p>
                    )}
                    <div className="gm-fb-reference">
                      <span className="gm-fb-ref-label">Doğru Çeviri:</span>
                      <span className="gm-fb-ref-text">{evaluation.correct_translation}</span>
                    </div>
                  </>
                ) : null}

                <button className="gm-next-btn" onClick={handleNextQuestion}>
                  {currentIndex + 1 >= questions.length ? "Sonuçları Gör ➔" : "Sonraki Soru ➔"}
                  <kbd className="wl-inline-kbd" style={{ marginLeft: "0.4rem", background: "rgba(0,0,0,0.3)" }}>Enter</kbd>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────────────── 3. MOD: OTURUM SONU ÖZETİ ────────────────────────── */
  if (mode === "done") {
    const correctCount = sessionHistory.filter((h) => h.evaluation.result === "correct").length;
    const imperfectCount = sessionHistory.filter((h) => h.evaluation.result === "imperfect").length;
    const wrongCount = sessionHistory.filter((h) => h.evaluation.result === "wrong").length;
    const netDelta = (correctCount * 1) + (imperfectCount * -1) + (wrongCount * -2);

    return (
      <div className="wl-done-page">
        <div className="wl-done-card">
          <div className="wl-done-header">
            <div className="wl-done-badge">🎉 Oturum Tamamlandı!</div>
            <h1>{currentTopic ? `${currentTopic.code} ${currentTopic.title}` : "Gramer Raporu"}</h1>
            <p className="wl-done-subtitle">
              Toplam <strong>{sessionHistory.length}</strong> soruluk çalışma tamamlandı.
            </p>
          </div>

          <div className="wl-done-stats-grid">
            <div className="wl-stat-card wl-stat-known">
              <div className="wl-stat-num">{correctCount}</div>
              <div className="wl-stat-label">Doğru</div>
              <div className="wl-stat-desc">+1 Puan</div>
            </div>
            <div className="wl-stat-card wl-stat-unsure">
              <div className="wl-stat-num">{imperfectCount}</div>
              <div className="wl-stat-label">Daha İyi Olabilir</div>
              <div className="wl-stat-desc">-1 Puan</div>
            </div>
            <div className="wl-stat-card wl-stat-dont">
              <div className="wl-stat-num">{wrongCount}</div>
              <div className="wl-stat-label">Yanlış</div>
              <div className="wl-stat-desc">-2 Puan</div>
            </div>
            <div className="wl-stat-card wl-stat-score">
              <div className="wl-stat-num" style={{ color: netDelta >= 0 ? "#86efac" : "#fca5a5" }}>
                {netDelta > 0 ? `+${netDelta}` : netDelta}
              </div>
              <div className="wl-stat-label">Net Puan Etkisi</div>
              <div className="wl-stat-desc">Skor Değişimi</div>
            </div>
          </div>

          <div className="wl-done-actions">
            <button className="wl-done-btn primary" onClick={() => handleStartSession(selectedTopicId)}>
              🔄 Bu Konuyu Tekrar Et
            </button>
            <button className="wl-done-btn secondary" onClick={() => setMode("select")}>
              📋 Başka Konu Seç
            </button>
            <Link to="/grammar-library" className="wl-done-btn secondary">
              🗂️ Gramer Kitaplığı
            </Link>
          </div>

          <div className="wl-done-list-section">
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Soru Dökümü</h3>
            <div className="wl-done-words-list">
              {sessionHistory.map((item, i) => (
                <div key={i} className={`wl-done-word-row wl-status-${item.evaluation.result === 'correct' ? 'know' : (item.evaluation.result === 'imperfect' ? 'unsure' : 'dont_know')}`} style={{ gridTemplateColumns: "1fr" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {item.question.source_lang.toUpperCase()} ➔ {item.question.target_lang.toUpperCase()}
                    </span>
                    <span className={`tag-${item.evaluation.result === 'correct' ? 'know' : (item.evaluation.result === 'imperfect' ? 'unsure' : 'dont')}`}>
                      {item.evaluation.result === "correct" ? "✅ Doğru (+1)" : (item.evaluation.result === "imperfect" ? "🤔 Geliştirilebilir (-1)" : "❌ Yanlış (-2)")}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem" }}>
                    {item.question.question_text}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                    Senin Çevirin: <em>{item.userTranslation}</em>
                  </div>
                  {item.evaluation.result !== "correct" && (
                    <div style={{ fontSize: "0.85rem", color: "var(--accent)" }}>
                      Doğru Çeviri: <strong>{item.evaluation.correct_translation}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}