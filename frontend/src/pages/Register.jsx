import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerStep1, registerStep2, registerStep3 } from "../api/endpoints";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const STEPS = ["E-posta", "Doğrulama", "Profil"];

export default function Register() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [level, setLevel] = useState("B1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // URL'den token gelirse step 2'ye geç
  useEffect(() => {
    const urlToken = searchParams.get("token");
    const urlStep = searchParams.get("step");
    if (urlToken && urlStep === "2") {
      setToken(urlToken);
      handleStep2Auto(urlToken);
    }
  }, []);

  const handleStep2Auto = async (t) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await registerStep2(t);
      setEmail(data.email);
      setStep(3);
    } catch {
      setError("Geçersiz veya süresi dolmuş bağlantı.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleStep1 = async () => {
    setError("");
    if (!email) { setError("E-posta zorunludur."); return; }
    setLoading(true);
    try {
      await registerStep1(email);
      setSuccess("Doğrulama e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    setError("");
    if (!password || !firstName || !lastName) {
      setError("Tüm alanları doldurun."); return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı."); return;
    }
    if (password !== passwordConfirm) {
      setError("Şifreler eşleşmiyor."); return;
    }
    setLoading(true);
    try {
      const { data } = await registerStep3(token, password, firstName, lastName, level);
      loginUser(data.access, data.refresh, data.user);
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.detail || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <Link to="/" className="auth-back">← Ana sayfa</Link>
        <div className="auth-logo">WordLearn</div>
        <h1>Hesap oluştur</h1>

        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div key={s} className={`stepper-item ${step > i + 1 ? "done" : ""} ${step === i + 1 ? "active" : ""}`}>
              <div className="stepper-circle">
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className="stepper-label">{s}</span>
              {i < STEPS.length - 1 && <div className="stepper-line" />}
            </div>
          ))}
        </div>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {/* Step 1 */}
        {step === 1 && (
          <>
            <div className="form-group">
              <label>E-posta adresi</label>
              <input
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStep1()}
              />
            </div>
            <button className="btn btn-primary" onClick={handleStep1} disabled={loading}>
              {loading ? "Gönderiliyor..." : "Doğrulama e-postası gönder"}
            </button>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="auth-waiting">
            <div className="auth-waiting-icon">📧</div>
            <p><strong>{email}</strong> adresine doğrulama e-postası gönderdik.</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              E-postadaki bağlantıya tıkladıktan sonra bu sayfa otomatik ilerleyecek.
            </p>
            <button
              className="btn"
              style={{ background: "var(--bg-hover)", color: "var(--text-muted)", marginTop: "1rem" }}
              onClick={() => { setStep(1); setSuccess(""); }}
            >
              Farklı e-posta kullan
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              ✓ {email} doğrulandı
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>Ad</label>
                <input
                  type="text"
                  placeholder="Adınız"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Soyad</label>
                <input
                  type="text"
                  placeholder="Soyadınız"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Şifre</label>
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

            <div className="form-group">
              <label>İngilizce seviyeniz</label>
              <div className="level-selector">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`level-btn ${level === l ? "active" : ""}`}
                    onClick={() => setLevel(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleStep3} disabled={loading}>
              {loading ? "Hesap oluşturuluyor..." : "Hesabı Oluştur"}
            </button>
          </>
        )}

        <div className="auth-links" style={{ justifyContent: "center" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Zaten hesabın var mı?{" "}
            <Link to="/login">Giriş yap</Link>
          </span>
        </div>
      </div>
    </div>
  );
}