import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  getGrammarTopics,
  startGrammarSession,
  submitGrammarTranslation,
  selfEvaluateGrammarTranslation,
  reportGrammarQuestion,
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
  const [selfEvalData, setSelfEvalData] = useState(null);
  const [selfEvalLoading, setSelfEvalLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
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
      })
      .catch(() => setError("Konular yüklenirken hata oluştu."))
      .finally(() => setLoading(false));
  }, [level]);

  // Soru değiştiğinde input'a odaklan
  useEffect(() => {
    if (mode === "practice" && !evaluation && !selfEvalData && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, mode, evaluation, selfEvalData]);

  // Klavye Kısayolları (Keyboard Shortcuts)
  useEffect(() => {
    if (mode !== "practice" || showReportModal) return;

    const handleKeyDown = (e) => {
      // Input içindeyken 1,2,3 dinleme, sadece Enter'a bak
      const isInputFocused = document.activeElement === inputRef.current;

      if (e.key === "Enter" && !e.shiftKey) {
        if (evaluation) {
          e.preventDefault();
          handleNextQuestion();
        } else if (!selfEvalData && userTranslation.trim() && !submitting) {
          e.preventDefault();
          handleSubmit();
        }
      } else if (selfEvalData && !selfEvalLoading && !isInputFocused) {
        if (e.key === "1" || e.key === "ArrowRight") {
          e.preventDefault();
          handleSelfEval("know");
        } else if (e.key === "2" || e.key === "ArrowLeft") {
          e.preventDefault();
          handleSelfEval("dont_know");
        } else if (e.key === "3" || e.key === "ArrowDown") {
          e.preventDefault();
          handleSelfEval("ask_ai");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, evaluation, selfEvalData, selfEvalLoading, userTranslation, submitting, showReportModal]);

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
      setSelfEvalData(null);
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
    setSelfEvalData(null);
    setEvaluation(null);

    try {
      const res = await submitGrammarTranslation(
        currentQ.id,
        userTranslation.trim()
      );

      if (res.data.matched) {
        // Yerel kontrolde kesin doğru eşleşti
        setEvaluation(res.data);
        setSessionHistory((prev) => [
          ...prev,
          {
            question: currentQ,
            userTranslation: userTranslation.trim(),
            evaluation: res.data,
          },
        ]);
      } else {
        // Yerel kontrolde emin olunamadı -> Doğru çeviriyi göster ve self-eval başlat
        setSelfEvalData(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Değerlendirme alınamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelfEval = async (action) => {
    if (selfEvalLoading) return;
    const currentQ = questions[currentIndex];
    setSelfEvalLoading(true);

    try {
      const res = await selfEvaluateGrammarTranslation(
        currentQ.id,
        action,
        userTranslation.trim()
      );
      setEvaluation(res.data);
      setSelfEvalData(null);
      setSessionHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          userTranslation: userTranslation.trim(),
          evaluation: res.data,
        },
      ]);
    } catch (err) {
      alert(err.response?.data?.detail || "Değerlendirme kaydedilemedi.");
    } finally {
      setSelfEvalLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setMode("done");
    } else {
      setCurrentIndex((i) => i + 1);
      setUserTranslation("");
      setEvaluation(null);
      setSelfEvalData(null);
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

        {/* Kontrol Çubuğu (Seçilen konu tek bir yerde burada yazar) */}
        <div className="gm-controls">
          <div className="gm-controls-left">
            <span>
              {selectedTopicObj ? (
                <>Seçilen Konu: <strong>{selectedTopicObj.code} — {selectedTopicObj.title}</strong></>
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

        {/* Konu Kartları (Radio button simgeleri kaldırıldı) */}
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

        {/* Başlat Çubuğu (Mükerrer başlık kaldırıldı, sadece eylem butonu ve özet bilgi) */}
        <div className="gm-start-bar">
          <div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              {selectedTopicObj
                ? `${selectedTopicObj.level} seviyesinde ${questionCount} çeviri sorusu sorulacak.`
                : "Başlamak için lütfen yukarıdan bir konu seçin."}
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

  /* ────────────────────────── 2. MOD: PRATİK EKRANI ────────────────────────── */
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
            {/* Meta Bilgiler & Hata Bildir Butonu */}
            <div className="gm-question-meta">
              <span className="gm-lang-direction">{directionBadge}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {currentTopic && (
                  <span className="gm-topic-tag">
                    {currentTopic.code} {currentTopic.title}
                  </span>
                )}
                <button
                  className="gm-report-trigger"
                  onClick={() => setShowReportModal(true)}
                  title="Soruda bir hata veya eksiklik varsa bildirin"
                >
                  ⚠️ Hata Bildir
                </button>
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
                disabled={submitting || !!evaluation || !!selfEvalData}
              />

              {!evaluation && !selfEvalData && (
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
                    {submitting ? "Kontrol Ediliyor..." : "Kontrol Et ➔"}
                  </button>
                </div>
              )}
            </div>

            {/* Kendi Kendini Değerlendir (Self-Evaluation) Kutusu */}
            {selfEvalData && !evaluation && (
              <div className="gm-self-eval-box">
                <div className="gm-self-eval-title">
                  <span>🧐 Çevirinizi Karşılaştırın:</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>
                    Kısayollar: 1 (Doğru), 2 (Yanlış), 3 (Yapay Zeka)
                  </span>
                </div>

                <div className="gm-answers-comparison">
                  <div className="gm-answer-row">
                    <span className="gm-answer-label">Sizin Çeviriniz:</span>
                    <span className="gm-answer-val gm-val-user">
                      {selfEvalData.user_translation || userTranslation}
                    </span>
                  </div>

                  <div className="gm-answer-row">
                    <span className="gm-answer-label">Doğru Referans Çeviri:</span>
                    <span className="gm-answer-val gm-val-ref">
                      {selfEvalData.correct_translation}
                    </span>
                    {selfEvalData.alternatives?.length > 0 && (
                      <div className="gm-alt-chips">
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "center" }}>
                          Kabul edilen alternatifler:
                        </span>
                        {selfEvalData.alternatives.map((alt, i) => (
                          <span key={i} className="gm-alt-chip">{alt}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="gm-self-eval-actions">
                  <button
                    className="gm-eval-btn gm-btn-know"
                    onClick={() => handleSelfEval("know")}
                    disabled={selfEvalLoading}
                  >
                    ✅ Doğru Bildim (+1)
                  </button>

                  <button
                    className="gm-eval-btn gm-btn-dont"
                    onClick={() => handleSelfEval("dont_know")}
                    disabled={selfEvalLoading}
                  >
                    ❌ Yanlış Bildim (-2)
                  </button>

                  <button
                    className="gm-eval-btn gm-btn-ai"
                    onClick={() => handleSelfEval("ask_ai")}
                    disabled={selfEvalLoading}
                  >
                    {selfEvalLoading ? "Analiz Ediliyor..." : "🤖 Yapay Zeka Kontrol Etsin"}
                  </button>
                </div>
              </div>
            )}

            {/* Sonuç & Değerlendirme Kartı */}
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

                {evaluation.feedback && (
                  <p className="gm-fb-text">{evaluation.feedback}</p>
                )}

                {evaluation.result !== "correct" && evaluation.correct_translation && (
                  <div className="gm-fb-reference">
                    <span className="gm-fb-ref-label">Doğru Çeviri:</span>
                    <span className="gm-fb-ref-text">{evaluation.correct_translation}</span>
                  </div>
                )}

                <button className="gm-next-btn" onClick={handleNextQuestion}>
                  {currentIndex + 1 >= questions.length ? "Sonuçları Gör ➔" : "Sonraki Soru ➔"}
                  <kbd className="wl-inline-kbd" style={{ marginLeft: "0.4rem", background: "rgba(0,0,0,0.3)" }}>Enter</kbd>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hata Bildir Modalı */}
        {showReportModal && (
          <GrammarReportModal
            question={currentQ}
            onClose={() => setShowReportModal(false)}
          />
        )}
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
            <h1>{currentTopic ? `${currentTopic.code} — ${currentTopic.title}` : "Gramer Raporu"}</h1>
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

          <div className="wl-done-history">
            <h3 className="wl-history-title">Soru Detayları</h3>
            <div className="wl-history-list">
              {sessionHistory.map((item, idx) => (
                <div key={idx} className="wl-history-item">
                  <div className="wl-history-word">
                    <span className="wl-history-en">{item.question.question_text}</span>
                    <span className="wl-history-tr">
                      Sizin Çeviriniz: <strong>{item.userTranslation}</strong>
                    </span>
                    {item.evaluation.result !== "correct" && (
                      <span style={{ fontSize: "0.8rem", color: "var(--accent)", marginTop: "0.2rem" }}>
                        Doğrusu: {item.evaluation.correct_translation || item.question.reference_translation}
                      </span>
                    )}
                  </div>
                  <div className="wl-history-right">
                    <span className={`wl-history-badge wl-badge-${item.evaluation.result === "correct" ? "know" : (item.evaluation.result === "imperfect" ? "unsure" : "dont")}`}>
                      {item.evaluation.result === "correct" && "+1 Doğru"}
                      {item.evaluation.result === "imperfect" && "-1 Pürüz"}
                      {item.evaluation.result === "wrong" && "-2 Yanlış"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="wl-done-actions">
            <button className="btn btn-secondary" onClick={() => setMode("select")}>
              Başka Konu Seç
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleStartSession(currentTopic?.id)}
            >
              Bu Konuyu Tekrar Çalış ➔
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ── Hata Bildirimi Modalı (Kelime modülü gibi) ── */
function GrammarReportModal({ question, onClose }) {
  const [reason, setReason] = useState("wrong_translation");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await reportGrammarQuestion(question.id, reason, comment);
      setSent(true);
    } catch {
      alert("Hata bildirimi gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal report-modal" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h2>✅ Bildiriminiz Alındı</h2>
            <p className="modal-sub">Geri bildiriminiz için teşekkürler, inceleyeceğiz.</p>
            <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={onClose}>
              Kapat
            </button>
          </>
        ) : (
          <>
            <h2>Gramer Sorusu Sorun Bildir</h2>
            <p className="modal-sub" style={{ fontStyle: "italic", marginTop: "0.4rem" }}>
              "{question.question_text}"
            </p>

            <div className="gm-report-form">
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
                  Hata Türü:
                </label>
                <select
                  className="gm-report-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="wrong_translation">Hatalı / Yanlış Çeviri</option>
                  <option value="typo">Yazım / İmla Hatası</option>
                  <option value="missing_alternative">Eksik Doğru Alternatif</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
                  Açıklama (İsteğe bağlı):
                </label>
                <textarea
                  className="gm-report-textarea"
                  rows={3}
                  placeholder="Doğrusu ne olmalı veya nasıl geliştirilebilir?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                  Vazgeç
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? "Gönderiliyor..." : "Raporu Gönder"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}