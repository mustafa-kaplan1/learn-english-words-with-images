import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../api/endpoints";

export default function Login() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Tüm alanları doldurun."); return; }
    setLoading(true);
    try {
      const { data } = await login(email, password);
      loginUser(data.access, data.refresh, data.user);
      navigate("/home");
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(msg || "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-back">← Ana sayfa</Link>
        <div className="auth-logo">WordLearn</div>
        <h1>Tekrar hoş geldin</h1>
        <p>Hesabına giriş yap.</p>

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

        <div className="form-group">
          <label>Şifre</label>
          <input
            type="password"
            placeholder="Şifreniz"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

        <div className="auth-links">
          <Link to="/forgot-password">Şifremi unuttum</Link>
          <Link to="/register">Kayıt ol</Link>
        </div>
      </div>
    </div>
  );
}