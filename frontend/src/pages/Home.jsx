import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserSettings } from "../api/endpoints";

export default function Home() {
  const { user, logoutUser } = useAuth();
  const [setSize, setSetSize] = useState(null);

  useEffect(() => {
    getUserSettings().then((res) => setSetSize(res.data.set_size));
  }, []);

  const cards = [
    {
      to: "/word-learn",
      icon: "🧠",
      title: "Word Learn",
      desc: "Kelime oturumu başlat",
      badge: setSize ? `${setSize} kelimelik set` : null,
      disabled: false,
    },
    {
      to: "/library",
      icon: "📚",
      title: "Kelime Kitaplığı",
      desc: "Tüm kelimelerin ve puanların",
      disabled: false,
    },
    {
      to: "/grammar",
      icon: "✏️",
      title: "Grammar",
      desc: "Gramer konuları",
      badge: "Yakında",
      disabled: true,
    },
    {
      to: "/grammar-library",
      icon: "🗂️",
      title: "Gramer Kitaplığı",
      desc: "Gramer notların",
      badge: "Yakında",
      disabled: true,
    },
    {
      to: "/settings",
      icon: "⚙️",
      title: "Ayarlar",
      desc: "Hesap ve tercihler",
      disabled: false,
    },
  ];

  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h1>Merhaba 👋</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
            {user?.email}
          </p>
        </div>
        <button className="btn-logout" onClick={logoutUser}>Çıkış yap</button>
      </div>

      <div className="home-grid">
        {cards.map((card) =>
          card.disabled ? (
            <div key={card.to} className="home-card disabled">
              <span className="card-icon">{card.icon}</span>
              <span className="card-title">{card.title}</span>
              <span className="card-desc">{card.desc}</span>
              {card.badge && <span className="card-badge">{card.badge}</span>}
            </div>
          ) : (
            <Link key={card.to} to={card.to} className="home-card">
              <span className="card-icon">{card.icon}</span>
              <span className="card-title">{card.title}</span>
              <span className="card-desc">{card.desc}</span>
              {card.badge && <span className="card-badge">{card.badge}</span>}
            </Link>
          )
        )}
      </div>
    </div>
  );
}