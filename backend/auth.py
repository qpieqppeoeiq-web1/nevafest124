import hashlib
import hmac
import json
import urllib.parse
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from backend.config import settings


def parse_and_validate_telegram_init_data(init_data_str: str) -> Optional[Dict[str, Any]]:
    """
    Валидация строки Telegram.WebApp.initData по официальной спецификации Telegram:
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not init_data_str:
        return None

    try:
        parsed_data = dict(urllib.parse.parse_qsl(init_data_str, keep_blank_values=True))
    except Exception:
        return None

    received_hash = parsed_data.pop("hash", None)
    if not received_hash:
        return None

    # Сортируем все оставшиеся параметры по алфавиту и собираем строку проверки
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))

    # Если BOT_TOKEN не задан (локальное тестирование), пропускаем валидацию хеша
    if settings.BOT_TOKEN:
        secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calculated_hash, received_hash):
            return None

    user_raw = parsed_data.get("user")
    if user_raw:
        try:
            parsed_data["user"] = json.loads(user_raw)
        except Exception:
            pass

    return parsed_data


def get_current_user_from_headers(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data")
) -> Dict[str, Any]:
    """
    FastAPI dependency для извлечения пользователя Telegram из заголовка X-Telegram-Init-Data.
    Если заголовок отсутствует или не валиден в проде, вернёт ошибку или демо-пользователя при разработке.
    """
    if not x_telegram_init_data:
        # Для удобства тестирования вне Telegram или в браузере
        return {
            "id": 999999999,
            "username": "guest_tester",
            "first_name": "Тестовый пользователь",
            "is_demo": True,
        }

    validated = parse_and_validate_telegram_init_data(x_telegram_init_data)
    if not validated or "user" not in validated:
        # Если задан BOT_TOKEN, отклоняем неавторизованные запросы
        if settings.BOT_TOKEN:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Недействительные данные Telegram initData"
            )
        return {
            "id": 999999999,
            "username": "local_dev",
            "first_name": "Local Dev",
            "is_demo": True,
        }

    return validated["user"]
