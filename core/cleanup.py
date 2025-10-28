import threading
import time
from datetime import datetime
from models.models import VerificationCode
from db import session


def cleanup_verification_codes():
    while True:
        try:
            now = datetime.now()
            deleted = session.query(VerificationCode).filter(VerificationCode.expires_at < now).delete()
            session.commit()
            if deleted:
                print(f"🧹 Удалено {deleted} просроченных кодов.")
        except Exception as e:
            print(f"⚠️ Ошибка при очистке кодов: {e}")

        time.sleep(100)

def start_cleanup_thread():
    thread = threading.Thread(target=cleanup_verification_codes, daemon=True)
    thread.start()
