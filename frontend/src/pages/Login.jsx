import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { login, register } from "../api/endpoints";

export default function Login() {
  const { loginUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const fn = isRegister ? register : login;
      const { data } = await fn(email, password);
      loginUser(data.access, data.refresh, data.user ?? { email });
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === "object") {
        setError(Object.values(msg).flat().join(" "));
      } else {
        setError("Bir hata oluştu, tekrar dene.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{isRegister ? "Hesap oluştur" : "Tekrar hoş geldin"}</h1>
        <p>{isRegister ? "Öğrenmeye hemen başla." : "WordLearn'e giriş yap."}</p>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label>E-posta</label>
          <input
            type="email"
            placeholder="ornek@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>

        <div className="form-group">
          <label>Şifre</label>
          <input
            type="password"
            placeholder="En az 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Bekle..." : isRegister ? "Kayıt ol" : "Giriş yap"}
        </button>

        <div className="auth-switch">
          {isRegister ? "Zaten hesabın var mı?" : "Hesabın yok mu?"}{" "}
          <button onClick={() => { setIsRegister(!isRegister); setError(""); }}>
            {isRegister ? "Giriş yap" : "Kayıt ol"}
          </button>
        </div>
      </div>
    </div>
  );
}