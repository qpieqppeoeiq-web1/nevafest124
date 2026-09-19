# 🎪 Telegram Web App для управления задачами на фестивале

Полнофункциональная система координации фестивальных задач:
- **Telegram Bot** на **aiogram 3** (работает через Webhook для экономии ресурсов и совместимости с бесплатным тарифом Render).
- **Бэкенд** на **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL** (асинхронный драйвер `asyncpg`).
- **Фронтенд (Web App)**: HTML5, CSS3, ES6 JavaScript, Telegram WebApp SDK, CDN-клиент **@supabase/supabase-js**.
- **Хранение изображений**: **Supabase Storage** (прямая загрузка файлов из браузера/телефона через JS-клиент Supabase, в БД сохраняется только публичный URL).

---

## 📁 Структура проекта

```text
festival-task-manager/
├── .env.example              # Пример переменных окружения со всеми ключами
├── Dockerfile                # Оптимизированный Dockerfile для деплоя
├── requirements.txt          # Python-зависимости проекта
├── render.yaml               # Шаблон автоматического развертывания Blueprint на Render
├── README.md                 # Полная документация, настройка и запуск
│
├── backend/                  # Бэкенд на Python (FastAPI) + aiogram бот
│   ├── __init__.py
│   ├── config.py             # Настройки Pydantic Settings, загрузка ENV
│   ├── database.py           # Настройка асинхронного движка SQLAlchemy & сессий
│   ├── models.py             # Модели БД: User, Task, Message, ProgressBar
│   ├── schemas.py            # Pydantic-схемы валидации запросов и ответов
│   ├── auth.py               # Валидация Telegram.WebApp.initData по HMAC-SHA256
│   ├── bot.py                # Бот aiogram: /start, кнопка запуска WebApp, отправка уведомлений
│   └── main.py               # FastAPI приложение, роуты API, webhook, раздача статики
│
└── frontend/                 # Telegram Web App (HTML/CSS/JS)
    ├── index.html            # Интерфейс с модальными окнами, формами и чатом
    ├── style.css             # Тёмный минималистичный дизайн для мобильных экранов
    └── app.js                # Логика клиента, загрузка фото в Supabase, API-запросы
```

---

## 🔐 Роли и пароли доступа

1. **Волонтёр**:
   - Не требует пароля при входе через Telegram.
   - Видит только назначенные ему задания или задания с совпадающими тегами (например, `#звук`, `#одежда`).
   - Изменяет статусы заданий: **«Выполняется»** и **«Выполнено»**.
   - Общается с координаторами в ветке обсуждения под задачей.
   - Видит заполнение общих прогресс-баров фестиваля в реальном времени.

2. **Организатор (Код `1965`)**:
   - Просмотр всех актуальных заданий фестиваля.
   - Управление статусами и ответы на вопросы волонтёров.

3. **Главный администратор (Код `19907`)**:
   - Полные права организатора.
   - Создание новых заданий с фото, ссылками, тегами и маркером срочности (🔴 Красный, 🟡 Жёлтый, 🟢 Зелёный).
   - Автоматическая рассылка уведомлений в Telegram назначенным волонтёрам.
   - Управление тегами пользователей (например, «звук», «сцена», «питание», «журнал»).
   - Создание прогресс-баров глобальных целей фестиваля с привязкой к тегам.
   - Доступ к архиву завершённых заданий.

---

## 🪣 Настройка Supabase Storage

1. Зарегистрируйтесь на [supabase.com](https://supabase.com) и создайте новый проект.
2. Перейдите в раздел **Storage** -> **New Bucket**.
3. Создайте бакет с именем `festival-tasks` и включите переключатель **Public bucket**.
4. В разделе **SQL Editor** выполните следующий запрос для настройки политик Row Level Security (RLS), разрешающих публичное чтение и загрузку файлов:

```sql
-- Разрешить публичный просмотр изображений заданий
CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT USING (bucket_id = 'festival-tasks');

-- Разрешить загрузку изображений
CREATE POLICY "Allow Uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'festival-tasks');
```

5. Перейдите в **Project Settings -> API** и скопируйте:
   - `Project URL` (переменная `SUPABASE_URL`)
   - `anon public key` (переменная `SUPABASE_ANON_KEY`)

---

## 🚀 Деплой на Render

Бесплатный тариф Render «засыпает» при отсутствии запросов. Бот в данном проекте настроен на **Webhook**, что гарантирует пробуждение приложения при обращении и отсутствие зависающих background polling-потоков.

### Шаг 1: Создание бота в Telegram
1. Напишите [@BotFather](https://t.me/BotFather) и создайте бота (`/newbot`).
2. Скопируйте полученный `BOT_TOKEN`.

### Шаг 2: Создание базы данных PostgreSQL на Render
1. В панели [Render](https://dashboard.render.com) нажмите **New +** -> **PostgreSQL**.
2. Укажите имя `festival-db` и нажмите **Create Database**.
3. Скопируйте **Internal Database URL** (или External).

### Шаг 3: Создание Web Service на Render
1. Нажмите **New +** -> **Web Service** и подключите репозиторий с проектом (или выберите Docker).
2. Параметры:
   - **Environment**: `Python` (или `Docker`)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
3. Добавьте переменные окружения (**Environment Variables**):
   - `BOT_TOKEN` = Ваш токен от BotFather
   - `WEBHOOK_URL` = URL вашего сервиса на Render (например: `https://festival-tasks.onrender.com`)
   - `DATABASE_URL` = Ссылка на подключение к PostgreSQL (из Шага 2)
   - `ORGANIZER_PASSWORD` = `1965`
   - `ADMIN_PASSWORD` = `19907`
   - `SUPABASE_URL` = URL проекта Supabase
   - `SUPABASE_ANON_KEY` = Анонимный ключ Supabase
   - `SUPABASE_BUCKET` = `festival-tasks`
4. Нажмите **Deploy Web Service**.

После запуска приложение автоматически установит Webhook в Telegram, создаст таблицы в БД и начнет отвечать на команду `/start` с кнопкой для открытия Web App!

---

## 💻 Локальный запуск (Local Development)

```bash
# Клонирование и переход в директорию
git clone <repo_url>
cd festival-task-manager

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt

# Копирование .env
cp .env.example .env

# Запуск сервера разработки
uvicorn backend.main:app --reload --port 8000
```

Откройте в браузере: `http://localhost:8000`
