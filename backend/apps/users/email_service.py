import resend
from django.conf import settings


def send_verification_email(email: str, token: str, code: str = ""):
    resend.api_key = settings.RESEND_API_KEY
    verify_url = f"{settings.FRONTEND_URL}/register?step=2&token={token}"

    code_html = ""
    if code:
        code_html = f'''
        <div style="margin: 20px 0; text-align: center;">
            <p style="margin-bottom: 8px; font-weight: 600; color: #4b5563;">6 Haneli Doğrulama Kodunuz:</p>
            <div style="font-size: 32px; letter-spacing: 6px; font-weight: 800; background: #f3f4f6; padding: 14px 24px; display: inline-block; border-radius: 10px; color: #1f2937; border: 1px dashed #6c63ff;">
                {code}
            </div>
            <p style="font-size: 0.85rem; color: #6b7280; margin-top: 6px;">Bu kodu açık olan kayıt sayfasına girebilirsiniz.</p>
        </div>
        <div style="text-align: center; margin: 15px 0; color: #9ca3af; font-size: 0.85rem;">— VEYA —</div>
        '''

    subject = f"WordLearn — {code} Doğrulama Kodu" if code else "WordLearn — E-posta adresinizi doğrulayın"

    resend.Emails.send({
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": email,
        "subject": subject,
        "html": f'''
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #111827; margin-top: 0; text-align: center;">E-posta Doğrulama</h2>
            <p style="color: #4b5563; line-height: 1.5; text-align: center;">WordLearn'e hoş geldiniz! Hesabınızı tamamlamak için e-posta adresinizi doğrulayın.</p>
            
            {code_html}

            <div style="text-align: center;">
                <a href="{verify_url}"
                   style="display: inline-block; background: #6c63ff; color: white;
                          padding: 0.85rem 1.8rem; border-radius: 8px; text-decoration: none;
                          font-weight: bold; margin: 10px 0;">
                   Tek Tıkla Doğrula
                </a>
            </div>

            <p style="color: #9ca3af; font-size: 0.8rem; margin-top: 24px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px;">
               Bu bağlantı ve kod <strong>30 dakika</strong> geçerlidir. Talebi siz yapmadıysanız bu e-postayı dikkate almayın.
            </p>
        </div>
        ''',
    })


def send_password_reset_email(email: str, token: str):
    resend.api_key = settings.RESEND_API_KEY
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    resend.Emails.send({
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": email,
        "subject": "WordLearn — Şifre sıfırlama",
        "html": f'''
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
        ''',
    })
