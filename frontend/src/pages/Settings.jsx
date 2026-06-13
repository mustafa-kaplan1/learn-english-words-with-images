import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Settings() {
  const { user, logoutUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handlePasswordChange = async () => {
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Yeni şifre en az 8 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess("Şifre başarıyla güncellendi.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === "object") {
        setError(Object.values(msg).flat().join(" "));
      } else {
        setError("Bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <Link to="/" className="wl-back">← Ana sayfa</Link>

      <h1 style={{ marginTop: "1rem", marginBottom: "2rem" }}>Ayarlar</h1>

      {/* Profil bilgisi */}
      <div className="settings-card">
        <h2 className="settings-section-title">Profil</h2>
        <div className="settings-row">
          <span className="settings-label">E-posta</span>
          <span className="settings-value">{user?.email}</span>
        </div>
      </div>

      {/* Şifre değiştir */}
      <div className="settings-card">
        <h2 className="settings-section-title">Şifre değiştir</h2>

        {error && <div className="error-msg">{error}</div>}
        {success && (
          <div className="error-msg" style={{ background: "#052e16", borderColor: "var(--success)", color: "#86efac" }}>
            {success}
          </div>
        )}

        <div className="form-group">
          <label>Mevcut şifre</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Yeni şifre</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Yeni şifre tekrar</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handlePasswordChange}
          disabled={loading}
        >
          {loading ? "Güncelleniyor..." : "Şifreyi güncelle"}
        </button>
      </div>

      {/* Hesap */}
      <div className="settings-card">
        <h2 className="settings-section-title">Hesap</h2>
        <button
          className="btn"
          style={{ background: "#3b1212", color: "#fca5a5", marginTop: "0.5rem" }}
          onClick={logoutUser}
        >
          Çıkış yap
        </button>
      </div>
    </div>
  );
}