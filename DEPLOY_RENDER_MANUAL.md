# Деплой на Render без GitHub (через ZIP)

## Архив готов: `C:\Users\Виталий\Desktop\nowaito-deploy.zip`

---

## Шаг 1: Создайте аккаунт на Render

1. Откройте https://render.com
2. **Sign Up** → используйте email или GitHub/Google
3. Подтвердите email

---

## Шаг 2: Создайте PostgreSQL базу

1. Dashboard → **New** → **PostgreSQL**
2. **Name**: `nowaito-db`
3. **Plan**: Free ($0/month)
4. Нажмите **Create Database**
5. Дождитесь статуса **Available** (1-2 минуты)
6. Скопируйте **External Database URL** (понадобится для backend)

---

## Шаг 3: Задеплойте Backend

1. Dashboard → **New** → **Web Service**
2. **Build and deploy from Git repository** → выберите **Upload your code**
3. Нажмите **Upload** → выберите файл `nowaito-deploy.zip`
4. Настройки:
   - **Name**: `nowaito-api`
   - **Runtime**: Node
   - **Region**: Frankfurt (EU) — ближайший
   - **Branch**: main
   - **Root Directory**: `backend`

5. **Build Command**:
   ```bash
   npm ci && npm run generate && npx prisma migrate deploy
   ```

6. **Start Command**:
   ```bash
   npm start
   ```

7. **Plan**: Free

8. **Environment Variables** (кнопка **Advanced**):
   ```
   NODE_ENV = production
   PORT = 10000
   DATABASE_URL = (вставьте URL из PostgreSQL базы)
   UPLOAD_DIR = /tmp/uploads
   JWT_SECRET = (придумайте длинную случайную строку, минимум 32 символа)
   JWT_REFRESH_SECRET = (другая длинная случайная строка)
   ```

9. Нажмите **Create Web Service**

Дождитесь статуса **Live** (3-5 минут).

**Ваш API URL**: `https://nowaito-api.onrender.com` (скопируйте для фронтенда)

---

## Шаг 4: Задеплойте Frontend

1. Dashboard → **New** → **Static Site**
2. **Upload your code** → выберите тот же `nowaito-deploy.zip`
3. Настройки:
   - **Name**: `nowaito-web`
   - **Runtime**: Static Site
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL = https://nowaito-api.onrender.com
   VITE_WS_URL = https://nowaito-api.onrender.com
   ```

5. Нажмите **Create Static Site**

Дождитесь деплоя (2-3 минуты).

---

## Шаг 5: Проверьте работу

- **Frontend**: https://nowaito-web.onrender.com
- **API**: https://nowaito-api.onrender.com/health (должен вернуть `{"ok":true}`)

---

## Шаг 6: Подключите свой домен (nowaito.com / nowaito.ru)

### Для Frontend:
1. Dashboard → `nowaito-web` → **Settings** → **Custom Domains**
2. **Add Custom Domain**
3. Введите: `nowaito.com` (или `www.nowaito.com`)
4. Render покажет DNS-записи — добавьте их в панели вашего регистратора домена

### Для Backend:
1. Dashboard → `nowaito-api` → **Settings** → **Custom Domains**
2. **Add Custom Domain**: `api.nowaito.com`
3. После подключения обновите `VITE_API_URL` и `VITE_WS_URL` во фронтенде

---

## ⚠️ Важно: Лимиты бесплатного плана

| Лимит | Значение |
|-------|----------|
| PostgreSQL | 90 дней, потом нужно создать новую |
| Web Service (Backend) | Спит через 15 мин без запросов, просыпается ~30 сек |
| Static Site | Без ограничений |
| Трафик | 100GB/месяц |
| RAM | 512MB |

**Чтобы backend не засыпал**: зайдите на https://uptimerobot.com → создайте мониторинг с проверкой каждые 5 минут.

---

## ❗ Если backend "спит"

При первом входе на сайт после долгого перерыва — подождите 30-60 секунд, пока сервер проснётся.

---

## 🔧 Устранение проблем

**"Build failed"**: Смотрите логи в Dashboard → Service → **Logs**

**"Cannot connect to database"**: Проверьте правильность `DATABASE_URL` (должен быть External URL, не Internal)

**"CORS error" в браузере**: Убедитесь что `VITE_API_URL` во фронтенде совпадает с URL бэкенда

---

## Готово! 🎉

Ваш мессенджер Nowaito доступен по адресу `https://nowaito-web.onrender.com`
