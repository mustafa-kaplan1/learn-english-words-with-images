import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { getUserSettings, updateUserSettings } from "../api/endpoints";

const SET_SIZES = [8, 16, 24, 32];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Settings() {
  const { user, logoutUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  const [setSize, setSetSize] = useState(32);
  const [userLevel, setUserLevel] = useState("B1");
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSuccess, setSettingsSuccess] = useState("");

  useEffect(() => {
    getUserSettings()
      .then((res) => {
        setSetSize(res.data.set_size);
        setUserLevel(res.data.level);
      })
      .finally(() => setSettingsLoading(false));
  }, []);

  const handleSetSize = async (size) => {
    setSetSize(size);
    setSettingsSuccess("");
    try {
      await updateUserSettings({ set_size: size });
      setSettingsSuccess("Kaydedildi.");
      setTimeout(() => setSettingsSuccess(""), 2000);
    } catch {
      // sessizce geç
    }
  };

  const handleLevel = async (level) => {
    setUserLevel(level);
    setSettingsSuccess("");
    try {
      await updateUserSettings({ level });
      setSettingsSuccess("Kaydedildi.");
      setTimeout(() => setSettingsSuccess(""), 2000);
    } catch {
      // sessizce geç
    }
  };

  const handlePasswordChange = async () => {
    setPwError("");
    setPwSuccess("");
    if (newPassword.length < 8) { setPwError("Yeni şifre en az 8 karakter olmalı."); return; }
    if (newPassword !== confirmPassword) { setPwError("Yeni şifreler eşleşmiyor."); return; }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwSuccess("Şifre başarıyla güncellendi.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      const msg = err.response?.data;
      setPwError(typeof msg === "object" ? Object.values(msg).flat().join(" ") : "Bir hata oluştu.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <Link to="/" className="wl-back">← Ana sayfa</Link>
      <h1 style={{ marginTop: "1rem", marginBottom: "2rem" }}>Ayarlar</h1>

      {/* Profil */}
      <div className="settings-card">
        <h2 className="settings-section-title">Profil</h2>
        <div className="settings-row">
          <span className="settings-label">E-posta</span>
          <span className="settings-value">{user?.email}</span>
        </div>
      </div>

      {/* Set büyüklüğü */}
      <div className="settings-card">
        <h2 className="settings-section-title">Standart set büyüklüğü</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Her grupta %25 yeni, %25 bilmediğin, %25 öğrendiğin, %25 iyi bildiğin kelime.
        </p>
        {settingsLoading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Yükleniyor...</p>
        ) : (
          <div className="settings-sizes">
            {SET_SIZES.map((s) => (
              <button
                key={s}
                className={`settings-size-btn ${setSize === s ? "active" : ""}`}
                onClick={() => handleSetSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {settingsSuccess && (
          <p style={{ color: "var(--success)", fontSize: "0.85rem", marginTop: "0.8rem" }}>
            {settingsSuccess}
          </p>
        )}
      </div>

      {/* Seviye seçimi */}
      <div className="settings-card">
        <h2 className="settings-section-title">İngilizce seviyem</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Seviyenden düşük kelimeleri bilirsen bonus puan kazanırsın.
        </p>
        {settingsLoading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Yükleniyor...</p>
        ) : (
          <div className="settings-sizes">
            {LEVELS.map((l) => (
              <button
                key={l}
                className={`settings-size-btn ${userLevel === l ? "active" : ""}`}
                onClick={() => handleLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Şifre */}
      <div className="settings-card">
        <h2 className="settings-section-title">Şifre değiştir</h2>
        {pwError && <div className="error-msg">{pwError}</div>}
        {pwSuccess && (
          <div className="error-msg" style={{ background: "#052e16", borderColor: "var(--success)", color: "#86efac" }}>
            {pwSuccess}
          </div>
        )}
        <div className="form-group">
          <label>Mevcut şifre</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Yeni şifre</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Yeni şifre tekrar</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={handlePasswordChange} disabled={pwLoading}>
          {pwLoading ? "Güncelleniyor..." : "Şifreyi güncelle"}
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