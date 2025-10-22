import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings

async def send_email(to_email: str, subject: str, body: str):
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_EMAIL and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.send_message(msg)
        print(f"✅ Письмо отправлено на {to_email}")
    except Exception as e:
        print(f"❌ Ошибка при отправке письма: {e}")