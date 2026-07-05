import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/endpoints";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email) { setError("E-posta zorunludur."); return; }
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/login" className="auth-back">← Giriş yap</Link>
        <div className="auth-logo">WordLearn</div>
        <h1>Şifremi unuttum</h1>

        {sent ? (
          <div className="auth-waiting">
            <div className="auth-waiting-icon">📧</div>
            <p>Şifre sıfırlama bağlantısı <strong>{email}</strong> adresine gönderildi.</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Gelen kutunuzu kontrol edin.
            </p>
          </div>
        ) : (
          <>
            <p>E-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz.</p>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>E-posta</label>
              <input
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Gönderiliyor..." : "Bağlantı Gönder"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}