import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <span className="landing-logo">WordLearn</span>
        <Link to="/login" className="btn-nav">Giriş Yap</Link>
      </nav>

      <div className="landing-hero">
        <div className="landing-badge">🚀 İngilizce öğrenmenin akıllı yolu</div>
        <h1 className="landing-title">
          Kelimeleri öğren,<br />
          <span className="landing-accent">seviyeni yükselt.</span>
        </h1>
        <p className="landing-desc">
          Kişiselleştirilmiş kelime setleri, akıllı tekrar algoritması ve
          görsel destekli öğrenme ile İngilizce kelimeleri kalıcı olarak öğren.
        </p>
        <div className="landing-actions">
          <Link to="/register" className="btn-hero-primary">Ücretsiz Başla</Link>
          <Link to="/login" className="btn-hero-secondary">Giriş Yap</Link>
        </div>
      </div>

      <div className="landing-features">
        {[
          { icon: "🧠", title: "Akıllı Algoritma", desc: "32 kelimelik kişisel setler, güçlü ve zayıf yönlerinize göre seçilir." },
          { icon: "🖼️", title: "Görsel Öğrenme", desc: "Her kelime için 4 görsel ile kavramsal bağ kurarak kalıcı öğren." },
          { icon: "📈", title: "İlerleme Takibi", desc: "Puanlama sistemi ile hangi kelimeleri öğrendiğini anlık takip et." },
        ].map((f) => (
          <div key={f.title} className="landing-feature-card">
            <span className="landing-feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="landing-cta">
        <h2>Hemen başlamaya hazır mısın?</h2>
        <Link to="/register" className="btn-hero-primary">Hesap Oluştur</Link>
      </div>

      <footer className="landing-footer">
        <span>© 2025 WordLearn</span>
      </footer>
    </div>
  );
}