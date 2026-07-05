import resend
from django.conf import settings


def send_verification_email(email: str, token: str):
    resend.api_key = settings.RESEND_API_KEY
    verify_url = f"{settings.FRONTEND_URL}/register?step=2&token={token}"

    resend.Emails.send({
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": email,
        "subject": "WordLearn — E-posta adresinizi doğrulayın",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>E-posta adresinizi doğrulayın</h2>
            <p>Aşağıdaki butona tıklayarak e-posta adresinizi doğrulayın.
               Bu bağlantı <strong>30 dakika</strong> geçerlidir.</p>
            <a href="{verify_url}"
               style="display: inline-block; background: #6c63ff; color: white;
                      padding: 0.8rem 1.5rem; border-radius: 8px; text-decoration: none;
                      font-weight: bold; margin: 1rem 0;">
               E-postayı Doğrula
            </a>
            <p style="color: #888; font-size: 0.85rem;">
               Bu e-postayı siz talep etmediyseniz dikkate almayın.
            </p>
        </div>
        """,
    })


def send_password_reset_email(email: str, token: str):
    resend.api_key = settings.RESEND_API_KEY
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    resend.Emails.send({
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": email,
        "subject": "WordLearn — Şifre sıfırlama",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Şifrenizi sıfırlayın</h2>
            <p>Aşağıdaki butona tıklayarak şifrenizi sıfırlayın.
               Bu bağlantı <strong>1 saat</strong> geçerlidir.</p>
            <a href="{reset_url}"
               style="display: inline-block; background: #6c63ff; color: white;
                      padding: 0.8rem 1.5rem; border-radius: 8px; text-decoration: none;
                      font-weight: bold; margin: 1rem 0;">
               Şifreyi Sıfırla
            </a>
            <p style="color: #888; font-size: 0.85rem;">
               Bu e-postayı siz talep etmediyseniz dikkate almayın.
            </p>
        </div>
        """,
    })