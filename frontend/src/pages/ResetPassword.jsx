import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/endpoints";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 8) { setError("Şifre en az 8 karakter olmalı."); return; }
    if (password !== passwordConfirm) { setError("Şifreler eşleşmiyor."); return; }
    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate("/login?reset=success");
    } catch (err) {
      setError(err.response?.data?.detail || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p style={{ color: "var(--danger)" }}>Geçersiz bağlantı.</p>
          <Link to="/login">Giriş sayfasına dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">WordLearn</div>
        <h1>Yeni şifre belirle</h1>
        {error && <div className="error-msg">{error}</div>}
        <div className="form-group">
          <label>Yeni şifre</label>
          <input
            type="password"
            placeholder="En az 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Şifre tekrar</label>
          <input
            type="password"
            placeholder="Şifrenizi tekrar girin"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
        </button>
      </div>
    </div>
  );
}