import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserSettings } from "../api/endpoints";

const cards = [
  {
    to: "/word-learn",
    icon: "🧠",
    title: "Word Learn",
    desc: "Kelime oturumu başlat",
    disabled: false,
    showBadge: true,
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

export default function Home() {
  const { user } = useAuth();
  const [setSize, setSetSize] = useState(null);

  useEffect(() => {
    getUserSettings().then((res) => setSetSize(res.data.set_size));
  }, []);

  const firstName = user?.first_name || user?.email?.split("@")[0] || "";

  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h1>Hoş geldin, {firstName} 👋</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
            {user?.email}
          </p>
        </div>
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
              {card.showBadge && setSize && (
                <span className="card-badge">{setSize} kelimelik set</span>
              )}
            </Link>
          )
        )}
      </div>
    </div>
  );
}