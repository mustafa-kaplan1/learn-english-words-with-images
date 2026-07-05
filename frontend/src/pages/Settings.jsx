import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserSettings, updateUserSettings, updateProfile } from "../api/endpoints";

const SET_SIZES = [8, 16, 24, 32];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Settings() {
  const { user, logoutUser, loginUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

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

  const handleProfileSave = async () => {
    setProfileError("");
    setProfileSuccess("");
    if (!firstName || !lastName) { setProfileError("Ad ve soyad zorunludur."); return; }
    setProfileLoading(true);
    try {
      const { data } = await updateProfile({ first_name: firstName, last_name: lastName });
      // AuthContext'teki user'ı güncelle
      loginUser(
        localStorage.getItem("access"),
        localStorage.getItem("refresh"),
        data,
      );
      setProfileSuccess("Profil güncellendi.");
      setTimeout(() => setProfileSuccess(""), 2000);
    } catch {
      setProfileError("Bir hata oluştu.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSetSize = async (size) => {
    setSetSize(size);
    setSettingsSuccess("");
    try {
      await updateUserSettings({ set_size: size });
      setSettingsSuccess("Kaydedildi.");
      setTimeout(() => setSettingsSuccess(""), 2000);
    } catch {}
  };

  const handleLevel = async (level) => {
    setUserLevel(level);
    setSettingsSuccess("");
    try {
      await updateUserSettings({ level });
      setSettingsSuccess("Kaydedildi.");
      setTimeout(() => setSettingsSuccess(""), 2000);
    } catch {}
  };

  return (
    <div className="settings-page">
      <Link to="/home" className="wl-back">← Ana sayfa</Link>
      <h1 style={{ marginTop: "1rem", marginBottom: "2rem" }}>Ayarlar</h1>

      {/* Profil */}
      <div className="settings-card">
        <h2 className="settings-section-title">Profil bilgileri</h2>

        <div className="settings-row">
          <span className="settings-label">E-posta</span>
          <span className="settings-value">{user?.email}</span>
        </div>

        <div className="form-row" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label>Ad</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Adınız"
            />
          </div>
          <div className="form-group">
            <label>Soyad</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Soyadınız"
            />
          </div>
        </div>

        {profileError && <div className="error-msg">{profileError}</div>}
        {profileSuccess && <div className="success-msg">{profileSuccess}</div>}

        <button
          className="btn btn-primary"
          onClick={handleProfileSave}
          disabled={profileLoading}
          style={{ marginTop: "0.5rem" }}
        >
          {profileLoading ? "Kaydediliyor..." : "Kaydet"}
        </button>
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

      {/* Seviye */}
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