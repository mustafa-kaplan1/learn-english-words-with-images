import { useState, useEffect, useRef } from "react";
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
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [level, setLevel] = useState("B1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sekmeler arası iletişim (Cross-Tab Sync)
  useEffect(() => {
    let channel;
    try {
      channel = new BroadcastChannel("imgen_register_channel");
      channel.onmessage = (event) => {
        if (event.data?.type === "VERIFIED" && event.data?.token) {
          setToken(event.data.token);
          if (event.data.email) setEmail(event.data.email);
          setStep(3);
          setSuccess("E-posta diğer sekmede başarıyla doğrulandı!");
        }
      };
    } catch {
      // BroadcastChannel desteklenmiyorsa sessizce geç
    }

    const handleStorage = (e) => {
      if (e.key === "imgen_reg_sync" && e.newValue) {
        try {
          const syncData = JSON.parse(e.newValue);
          if (syncData.token) {
            setToken(syncData.token);
            if (syncData.email) setEmail(syncData.email);
            setStep(3);
            setSuccess("E-posta diğer sekmede başarıyla doğrulandı!");
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // URL'den token gelirse (e-postadaki linke tıklandıysa)
  useEffect(() => {
    const urlToken = searchParams.get("token");
    const urlStep = searchParams.get("step");
    if (urlToken && urlStep === "2") {
      setToken(urlToken);
      handleStep2Auto(urlToken);
    }
  }, []);

  // Geri sayım sayacı (kod tekrar gönderme)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const notifyOtherTabs = (verifiedToken, verifiedEmail) => {
    try {
      const channel = new BroadcastChannel("imgen_register_channel");
      channel.postMessage({ type: "VERIFIED", token: verifiedToken, email: verifiedEmail });
      channel.close();
    } catch {
      // ignore
    }
    localStorage.setItem("imgen_reg_sync", JSON.stringify({
      token: verifiedToken,
      email: verifiedEmail,
      timestamp: Date.now(),
    }));
  };

  const handleStep2Auto = async (t) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await registerStep2(t);
      setEmail(data.email);
      setToken(data.token || t);
      notifyOtherTabs(data.token || t, data.email);
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
      const { data } = await registerStep1(email);
      setSuccess(data?.detail || "Doğrulama e-postası ve 6 haneli kod gönderildi.");
      if (data?.dev_code) {
        setCode(data.dev_code);
      }
      setResendCooldown(45);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (codeToVerify) => {
    const val = (codeToVerify || code).trim();
    if (val.length !== 6) {
      setError("Lütfen 6 haneli kodu eksiksiz girin.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await registerStep2({ email, code: val });
      setEmail(data.email);
      setToken(data.token);
      notifyOtherTabs(data.token, data.email);
      setSuccess("");
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || "Geçersiz veya süresi dolmuş kod.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
    if (val.length === 6) {
      handleVerifyCode(val);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      const { data } = await registerStep1(email);
      setSuccess(data?.detail || "Yeni doğrulama kodu gönderildi.");
      if (data?.dev_code) {
        setCode(data.dev_code);
      }
      setResendCooldown(45);
    } catch (err) {
      setError(err.response?.data?.detail || "Kod tekrar gönderilemedi.");
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
                autoFocus
              />
            </div>
            <button className="btn btn-primary" onClick={handleStep1} disabled={loading}>
              {loading ? "Gönderiliyor..." : "Doğrulama kodu gönder"}
            </button>
          </>
        )}

        {/* Step 2: 6 Haneli Kod & Sekme Eşitleme */}
        {step === 2 && (
          <div className="auth-step2-wrap">
            <div className="auth-waiting-icon">✉️</div>
            <p className="auth-step2-text">
              <strong>{email}</strong> adresine 6 haneli doğrulama kodu ve bağlantı gönderdik.
            </p>

            <div className="auth-code-box">
              <label className="auth-code-label">Doğrulama Kodunu Girin</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="auth-code-input"
                placeholder="· · · · · ·"
                value={code}
                onChange={handleCodeInput}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                autoFocus
              />
              <button
                className="btn btn-primary"
                onClick={() => handleVerifyCode()}
                disabled={loading || code.trim().length !== 6}
                style={{ marginTop: "0.8rem" }}
              >
                {loading ? "Doğrulanıyor..." : "Kodu Doğrula"}
              </button>
            </div>

            <div className="auth-divider">
              <span>VEYA</span>
            </div>

            <p className="auth-sync-hint">
              💡 E-postadaki <strong>"Tek Tıkla Doğrula"</strong> butonuna basarsanız bu sekme otomatik olarak bir sonraki adıma geçecektir.
            </p>

            <div className="auth-step2-footer">
              <button
                className="auth-text-btn"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
              >
                {resendCooldown > 0 ? `Tekrar kod gönder (${resendCooldown}s)` : "Kodu tekrar gönder"}
              </button>
              <span className="auth-dot">•</span>
              <button
                className="auth-text-btn"
                onClick={() => { setStep(1); setSuccess(""); setCode(""); }}
              >
                Farklı e-posta kullan
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <div className="auth-verified-badge">
              ✓ <strong>{email}</strong> doğrulandı
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ad</label>
                <input
                  type="text"
                  placeholder="Adınız"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
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
