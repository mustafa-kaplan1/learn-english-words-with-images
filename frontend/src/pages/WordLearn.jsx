import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
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
	const [transitioning, setTransitioning] = useState(false);
	const timeoutRef = useRef(null);
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const isCustomMode = searchParams.get("mode") === "custom";

	useEffect(() => {
		if (isCustomMode) {
			const raw = sessionStorage.getItem("customSet");
			if (!raw) { navigate("/library"); return; }
			const customWords = JSON.parse(raw);
			// WordLearn score bilgisi olmadan çalışır, score=0 varsayılan
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

		// Önce kartı kapat (animasyon: 550ms), sonra bir sonraki kelimeye geç
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
		}, 580); // flip animasyonu bittikten sonra
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
								<h3 className="wl-turkish">{word.turkish}</h3>
							</div>
							<div className="wl-images">
								{loadingImages && (
									<div className="wl-img-loading">Görseller yükleniyor...</div>
								)}
								{!loadingImages && images.length === 0 && (
									<div className="wl-img-loading">Görsel bulunamadı.</div>
								)}
								{images.map((url, i) => (
									<div key={i} className="wl-img-wrap">
										<img src={url} alt={word.english} className="wl-img" />
									</div>
								))}
							</div>
						</div>

					</div>
				</div>

				{/* Butonlar — her zaman görünür */}
				<div className="wl-buttons">
					<button
						className="wl-btn wl-dont"
						onClick={() => handleScore("dont_know")}
						disabled={transitioning}
					>
						😕 Bilmiyorum
					</button>
					<button
						className="wl-btn wl-unsure"
						onClick={() => handleScore("unsure")}
						disabled={transitioning}
					>
						🤔 Emin değilim
					</button>
					<button
						className="wl-btn wl-know"
						onClick={() => handleScore("know")}
						disabled={transitioning}
					>
						✅ Biliyorum
					</button>
				</div>
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
				<Link
					to="/word-learn"
					className="wl-done-btn primary"
					onClick={() => window.location.reload()}
				>
					Tekrar başlat
				</Link>
				<Link to="/" className="wl-done-btn">Ana sayfa</Link>
			</div>
		</div>
	);
}