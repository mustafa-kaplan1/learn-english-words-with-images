import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getWordSession, updateScore, getWordImages, reportWord } from "../api/endpoints";

export default function WordLearn() {
	const [words, setWords] = useState([]);
	const [index, setIndex] = useState(0);
	const [flipped, setFlipped] = useState(false);
	const [images, setImages] = useState([]);
	const [loadingImages, setLoadingImages] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [sessionDone, setSessionDone] = useState(false);
	const [transitioning, setTransitioning] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const [sessionHistory, setSessionHistory] = useState([]);
	const timeoutRef = useRef(null);
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const isCustomMode = searchParams.get("mode") === "custom";

	useEffect(() => {
		if (isCustomMode) {
			const raw = sessionStorage.getItem("customSet");
			if (!raw) { navigate("/library"); return; }
			const customWords = JSON.parse(raw);
			setWords(customWords.map((w) => ({ ...w, score: 0 })));
			setLoading(false);
		} else {
			getWordSession()
				.then((res) => setWords(res.data))
				.catch(() => setError("Kelimeler yüklenemedi."))
				.finally(() => setLoading(false));
		}
		return () => clearTimeout(timeoutRef.current);
	}, []);

	useEffect(() => {
		if (!flipped || !words[index]) return;
		setImages([]);
		setLoadingImages(true);
		getWordImages(words[index].id)
			.then((res) => setImages(res.data.images || []))
			.catch(() => setImages([]))
			.finally(() => setLoadingImages(false));
	}, [flipped, index]);

	const handleScore = (action) => {
		if (transitioning || !words[index]) return;
		const word = words[index];
		updateScore(word.id, action).catch(() => { });

		setSessionHistory((prev) => [
			...prev,
			{
				id: word.id,
				english: word.english,
				turkish: word.turkish,
				part_of_speech: word.part_of_speech,
				level: word.level,
				action: action,
			}
		]);

		setTransitioning(true);
		setFlipped(false);
		setImages([]);
		timeoutRef.current = setTimeout(() => {
			if (index + 1 >= words.length) {
				setSessionDone(true);
			} else {
				setIndex((i) => i + 1);
			}
			setTransitioning(false);
		}, 580);
	};

	// Klavye Kısayolları (Keyboard Shortcuts)
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (showReport || sessionDone || loading) return;
			const tag = e.target?.tagName?.toLowerCase();
			if (tag === "input" || tag === "textarea" || tag === "select") return;

			if (e.code === "Space") {
				e.preventDefault();
				if (!flipped && !transitioning) {
					setFlipped(true);
				}
			} else if (e.key === "1" || e.key === "ArrowLeft") {
				e.preventDefault();
				handleScore("dont_know");
			} else if (e.key === "2" || e.key === "ArrowDown") {
				e.preventDefault();
				handleScore("unsure");
			} else if (e.key === "3" || e.key === "ArrowRight") {
				e.preventDefault();
				handleScore("know");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [flipped, transitioning, showReport, sessionDone, loading, words, index]);

	if (loading) return <div className="loading">Kelimeler yükleniyor...</div>;
	if (error) return <div className="loading" style={{ color: "var(--danger)" }}>{error}</div>;
	if (sessionDone) return <SessionDone history={sessionHistory} total={words.length} />;

	const word = words[index];

	return (
		<div className="wl-page">
			<div className="wl-header">
				<Link to="/" className="wl-back">← Ana sayfa</Link>
				<span className="wl-progress">{index + 1} / {words.length}</span>
			</div>

			<div className="wl-bar">
				<div className="wl-bar-fill" style={{ width: `${((index + 1) / words.length) * 100}%` }} />
			</div>

			<div className="wl-content">
				{/* Kart */}
				<div
					className={`wl-card ${flipped ? "flipped" : ""}`}
					onClick={() => !flipped && !transitioning && setFlipped(true)}
				>
					<div className="wl-card-inner">
						{/* Ön yüz */}
						<div className="wl-front">
							<p className="wl-hint">Karta tıkla veya <kbd className="wl-inline-kbd">Boşluk</kbd> tuşuna bas →</p>
							<h2 className="wl-word">{word.english}</h2>
							<span className="wl-badge">{word.part_of_speech}</span>
						</div>

						{/* Arka yüz */}
						<div className="wl-back-face">
							<div className="wl-back-header">
								<span className="wl-back-english">{word.english}</span>
								<div className="wl-turkish-wrap">
									{Array.isArray(word.turkish)
										? <span className="wl-turkish-item">{word.turkish.join(", ")}</span>
										: <span className="wl-turkish-item">{word.turkish}</span>
									}
								</div>
							</div>
							<div className="wl-images-container">
								<div className="wl-images">
									{loadingImages && <div className="wl-img-loading">Görseller yükleniyor...</div>}
									{!loadingImages && images.length === 0 && <div className="wl-img-loading">Görsel bulunamadı.</div>}
									{images.map((url, i) => (
										<div key={i} className="wl-img-wrap">
											<img src={url} alt={word.english} className="wl-img" />
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Sağ panel: butonlar + kısayol ipuçları + sorun bildir */}
				<div className="wl-side">
					<div className="wl-buttons">
						<button className="wl-btn wl-dont" onClick={() => handleScore("dont_know")} disabled={transitioning}>
							<span className="wl-btn-text">😕 Bilmiyorum</span>
							<span className="wl-key-hint"><kbd>1</kbd> <kbd>←</kbd></span>
						</button>
						<button className="wl-btn wl-unsure" onClick={() => handleScore("unsure")} disabled={transitioning}>
							<span className="wl-btn-text">🤔 Emin değilim</span>
							<span className="wl-key-hint"><kbd>2</kbd> <kbd>↓</kbd></span>
						</button>
						<button className="wl-btn wl-know" onClick={() => handleScore("know")} disabled={transitioning}>
							<span className="wl-btn-text">✅ Biliyorum</span>
							<span className="wl-key-hint"><kbd>3</kbd> <kbd>→</kbd></span>
						</button>
					</div>

					<div className="wl-shortcuts-bar">
						<span className="wl-sc-item"><kbd>Boşluk</kbd> Çevir</span>
						<span className="wl-sc-item"><kbd>1-3</kbd> Puanla</span>
					</div>

					<button className="wl-report-btn" onClick={() => setShowReport(true)}>
						⚑ Sorun bildir
					</button>
				</div>
			</div>

			{/* Rapor modalı */}
			{showReport && (
				<ReportModal
					word={word}
					images={images}
					onClose={() => setShowReport(false)}
				/>
			)}
		</div>
	);
}

function ReportModal({ word, images, onClose }) {
	const [faultyImages, setFaultyImages] = useState([]);
	const [translationError, setTranslationError] = useState(false);
	const [sent, setSent] = useState(false);
	const [sending, setSending] = useState(false);

	const toggleImage = (i) => {
		setFaultyImages((prev) =>
			prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
		);
	};

	const handleSend = async () => {
		if (faultyImages.length === 0 && !translationError) return;
		setSending(true);
		try {
			await reportWord(word.id, faultyImages, translationError);
			setSent(true);
		} catch {
			// sessizce geç
		} finally {
			setSending(false);
		}
	};

	const imageLabels = ["1. görsel", "2. görsel", "3. görsel", "4. görsel"];

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal report-modal" onClick={(e) => e.stopPropagation()}>
				{sent ? (
					<>
						<h2>✅ Rapor gönderildi</h2>
						<p className="modal-sub">Teşekkürler, inceleyeceğiz.</p>
						<button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={onClose}>
							Kapat
						</button>
					</>
				) : (
					<>
						<h2>Sorun bildir</h2>
						<p className="modal-sub">{word.english}</p>

						{/* Görsel hata */}
						<div className="report-section">
							<p className="report-section-title">Görsel hatası</p>
							<div className="report-images">
								{imageLabels.map((label, i) => (
									<label key={i} className={`report-img-check ${faultyImages.includes(i) ? "checked" : ""}`}>
										<input
											type="checkbox"
											checked={faultyImages.includes(i)}
											onChange={() => toggleImage(i)}
										/>
										{images[i]
											? <img src={images[i]} alt={label} className="report-thumb" />
											: <div className="report-thumb-empty" />
										}
										<span>{label}</span>
									</label>
								))}
							</div>
						</div>

						{/* Çeviri hatası */}
						<label className="report-translation-check">
							<input
								type="checkbox"
								checked={translationError}
								onChange={(e) => setTranslationError(e.target.checked)}
							/>
							<span>Çeviri hatası</span>
						</label>

						<div className="report-actions">
							<button className="modal-cancel" onClick={onClose}>İptal</button>
							<button
								className="btn btn-primary"
								onClick={handleSend}
								disabled={sending || (faultyImages.length === 0 && !translationError)}
							>
								{sending ? "Gönderiliyor..." : "Gönder"}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function SessionDone({ history, total }) {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("all");

	const knownList = history.filter((item) => item.action === "know");
	const unsureList = history.filter((item) => item.action === "unsure");
	const dontKnowList = history.filter((item) => item.action === "dont_know");
	const needsReviewList = [...dontKnowList, ...unsureList];

	const count = history.length || total || 1;
	const knownPercent = Math.round((knownList.length / count) * 100);
	const unsurePercent = Math.round((unsureList.length / count) * 100);
	const dontKnowPercent = Math.round((dontKnowList.length / count) * 100);

	// Puan hesabı: know +1, unsure -1, dont_know -2
	const netScore = (knownList.length * 1) + (unsureList.length * -1) + (dontKnowList.length * -2);

	const displayedList = activeTab === "know"
		? knownList
		: activeTab === "unsure"
		? unsureList
		: activeTab === "dont_know"
		? dontKnowList
		: history;

	const handleReviewNeedsPractice = () => {
		if (needsReviewList.length === 0) return;
		sessionStorage.setItem("customSet", JSON.stringify(needsReviewList));
		navigate("/word-learn?mode=custom");
		window.location.reload();
	};

	const formatTurkish = (turkish) => {
		if (Array.isArray(turkish)) return turkish.join(", ");
		return turkish || "-";
	};

	return (
		<div className="wl-done-page">
			<div className="wl-done-card">
				<div className="wl-done-header">
					<div className="wl-done-badge">🎉 Oturum Tamamlandı!</div>
					<h1>Oturum Özeti</h1>
					<p className="wl-done-subtitle">Toplam <strong>{history.length}</strong> kelime üzerinde pratik yaptın.</p>
				</div>

				{/* İstatistik Kartları */}
				<div className="wl-done-stats-grid">
					<div className="wl-stat-card wl-stat-known">
						<div className="wl-stat-num">{knownList.length}</div>
						<div className="wl-stat-label">Bildiklerim</div>
						<div className="wl-stat-bar"><div style={{ width: `${knownPercent}%` }}></div></div>
						<div className="wl-stat-pct">%{knownPercent}</div>
					</div>

					<div className="wl-stat-card wl-stat-unsure">
						<div className="wl-stat-num">{unsureList.length}</div>
						<div className="wl-stat-label">Emin Değilim</div>
						<div className="wl-stat-bar"><div style={{ width: `${unsurePercent}%` }}></div></div>
						<div className="wl-stat-pct">%{unsurePercent}</div>
					</div>

					<div className="wl-stat-card wl-stat-dont">
						<div className="wl-stat-num">{dontKnowList.length}</div>
						<div className="wl-stat-label">Bilmediklerim</div>
						<div className="wl-stat-bar"><div style={{ width: `${dontKnowPercent}%` }}></div></div>
						<div className="wl-stat-pct">%{dontKnowPercent}</div>
					</div>

					<div className="wl-stat-card wl-stat-score">
						<div className="wl-stat-num" style={{ color: netScore >= 0 ? "#86efac" : "#fca5a5" }}>
							{netScore > 0 ? `+${netScore}` : netScore}
						</div>
						<div className="wl-stat-label">Net Puan Etkisi</div>
						<div className="wl-stat-desc">Performans Skoru</div>
					</div>
				</div>

				{/* Aksiyon Butonları */}
				<div className="wl-done-actions">
					{needsReviewList.length > 0 && (
						<button className="wl-done-btn practice-btn" onClick={handleReviewNeedsPractice}>
							🔄 Eksikleri Tekrar Et ({needsReviewList.length} Kelime)
						</button>
					)}
					<button className="wl-done-btn primary" onClick={() => {
						sessionStorage.removeItem("customSet");
						window.location.href = "/word-learn";
					}}>
						▶ Yeni Oturum Başlat
					</button>
					<Link to="/" className="wl-done-btn secondary">Ana Sayfa</Link>
				</div>

				{/* Kelime Dökümü ve Filtreler */}
				<div className="wl-done-list-section">
					<div className="wl-done-tabs">
						<button
							className={`wl-tab-btn ${activeTab === "all" ? "active" : ""}`}
							onClick={() => setActiveTab("all")}
						>
							Tümü ({history.length})
						</button>
						<button
							className={`wl-tab-btn ${activeTab === "know" ? "active" : ""}`}
							onClick={() => setActiveTab("know")}
						>
							✅ Bildiklerim ({knownList.length})
						</button>
						<button
							className={`wl-tab-btn ${activeTab === "unsure" ? "active" : ""}`}
							onClick={() => setActiveTab("unsure")}
						>
							🤔 Emin Değilim ({unsureList.length})
						</button>
						<button
							className={`wl-tab-btn ${activeTab === "dont_know" ? "active" : ""}`}
							onClick={() => setActiveTab("dont_know")}
						>
							😕 Bilmediklerim ({dontKnowList.length})
						</button>
					</div>

					<div className="wl-done-words-list">
						{displayedList.map((item, i) => (
							<div key={i} className={`wl-done-word-row wl-status-${item.action}`}>
								<div className="wl-word-main">
									<span className="wl-word-en">{item.english}</span>
									{item.part_of_speech && <span className="wl-word-pos">{item.part_of_speech}</span>}
									{item.level && <span className="wl-word-lvl">{item.level}</span>}
								</div>
								<div className="wl-word-tr">{formatTurkish(item.turkish)}</div>
								<div className="wl-word-tag">
									{item.action === "know" && <span className="tag-know">✅ Biliyorum</span>}
									{item.action === "unsure" && <span className="tag-unsure">🤔 Emin Değilim</span>}
									{item.action === "dont_know" && <span className="tag-dont">😕 Bilmiyorum</span>}
								</div>
							</div>
						))}
						{displayedList.length === 0 && (
							<div className="wl-done-empty">Bu kategoride kelime yok.</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
