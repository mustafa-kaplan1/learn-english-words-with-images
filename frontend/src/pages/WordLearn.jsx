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
		if (transitioning) return;
		const word = words[index];
		updateScore(word.id, action).catch(() => { });
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
							<p className="wl-hint">Karta tıkla →</p>
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

				{/* Sağ panel: butonlar + sorun bildir */}
				<div className="wl-side">
					<div className="wl-buttons">
						<button className="wl-btn wl-dont" onClick={() => handleScore("dont_know")} disabled={transitioning}>
							😕 Bilmiyorum
						</button>
						<button className="wl-btn wl-unsure" onClick={() => handleScore("unsure")} disabled={transitioning}>
							🤔 Emin değilim
						</button>
						<button className="wl-btn wl-know" onClick={() => handleScore("know")} disabled={transitioning}>
							✅ Biliyorum
						</button>
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

function SessionDone({ total }) {
	return (
		<div className="wl-done">
			<h2>🎉 Oturum tamamlandı!</h2>
			<p>{total} kelimeyi gözden geçirdin.</p>
			<div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
				<Link to="/word-learn" className="wl-done-btn primary" onClick={() => window.location.reload()}>
					Tekrar başlat
				</Link>
				<Link to="/" className="wl-done-btn">Ana sayfa</Link>
			</div>
		</div>
	);
}