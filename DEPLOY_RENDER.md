# Деплой на Render.com (бесплатно, без карты)

## Шаг 1: Загрузите код на GitHub

```bash
# Инициализируйте git репозиторий
git init
git add .
git commit -m "Initial commit"

# Создайте репозиторий на GitHub и загрузите код
git remote add origin https://github.com/ВАШ_НИК/nowaito.git
git push -u origin main
```

## Шаг 2: Создайте аккаунт на Render

1. Откройте https://render.com
2. Нажмите **Sign Up** → **Sign up with GitHub**
3. Авторизуйте доступ к репозиторию

## Шаг 3: Автоматический деплой через Render Blueprint

Render автоматически прочитает `render.yaml` и создаст все сервисы:

1. В Dashboard нажмите **Blueprint** → **New Blueprint Instance**
2. Выберите репозиторий `nowaito`
3. Нажмите **Approve** — Render создаст:
   - **PostgreSQL базу данных** (nowaito-db)
   - **Backend** (nowaito-api)
   - **Frontend** (nowaito-web)

Дождитесь завершения (5-10 минут).

## Шаг 4: Полученные URL

После деплоя:
- **API**: `https://nowaito-api.onrender.com`
- **Web**: `https://nowaito-web.onrender.com`

## Лимиты бесплатного плана

- **PostgreSQL**: 90 дней бесплатно (потом можно создать новую)
- **Web Service**: 512MB RAM, спит через 15 мин неактивности
- **Static Site**: Без ограничений
- **Трафик**: 100GB/месяц

## Ручная настройка (если Blueprint не сработал)

### 1. Создайте PostgreSQL базу
- Dashboard → **New** → **PostgreSQL**
- Name: `nowaito-db`
- Plan: **Free**
- Скопируйте **Internal Database URL**

### 2. Задеплойте Backend
- Dashboard → **New** → **Web Service**
- Выберите репозиторий
- Name: `nowaito-api`
- Runtime: **Node**
- Root Directory: `backend`
- Build Command: `npm ci && npm run generate && npx prisma migrate deploy`
- Start Command: `npm start`
- Plan: **Free**

**Environment Variables:**
```
NODE_ENV=production
PORT=10000
DATABASE_URL=(вставьте URL из базы)
UPLOAD_DIR=/tmp/uploads
JWT_SECRET=(сгенерируйте случайную строку)
JWT_REFRESH_SECRET=(сгенерируйте случайную строку)
```

### 3. Задеплойте Frontend
- Dashboard → **New** → **Static Site**
- Выберите репозиторий
- Name: `nowaito-web`
- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

**Environment Variables:**
```
VITE_API_URL=https://nowaito-api.onrender.com
VITE_WS_URL=https://nowaito-api.onrender.com
```

## Подключение своего домена (nowaito.com или nowaito.ru)

### Frontend:
1. Dashboard → `nowaito-web` → **Settings** → **Custom Domain**
2. Добавьте: `nowaito.com` или `www.nowaito.com`
3. Render покажет DNS-записи — добавьте их в регистраторе домена

### Backend:
1. Dashboard → `nowaito-api` → **Settings** → **Custom Domain**
2. Добавьте: `api.nowaito.com`
3. Обновите `VITE_API_URL` и `VITE_WS_URL` во фронтенде

## Устранение проблем

**"Service crashed"**: Проверьте логи в Dashboard → Service → **Logs**

**"Database connection failed"**: Проверьте `DATABASE_URL` в Environment Variables

**"CORS error"**: Убедитесь что фронтенд использует правильный `VITE_API_URL`
