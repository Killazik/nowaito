@echo off
chcp 65001 >nul
echo ==========================================
echo   Загрузка проекта на GitHub
echo ==========================================
echo.

REM Проверка наличия git
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ОШИБКА] Git не установлен!
    echo Скачайте: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Инициализация репозитория
if not exist .git (
    echo [1/4] Инициализация git репозитория...
    git init
) else (
    echo [1/4] Git репозиторий уже создан
)

REM Настройка пользователя
echo [2/4] Настройка git...
git config user.email "deploy@nowaito.com" 2>nul
git config user.name "Deploy Script" 2>nul

REM Добавление файлов
echo [3/4] Добавление файлов...
git add -A
git commit -m "Prepare for Render deployment" 2>nul || echo Коммит уже существует

echo.
echo ==========================================
echo [4/4] ДЕЙСТВИЕ ТРЕБУЕТСЯ!
echo ==========================================
echo.
echo 1. Создайте репозиторий на GitHub:
echo    https://github.com/new
echo.
echo 2. Введите команду (замените ВАШ_НИК):
echo    git remote add origin https://github.com/ВАШ_НИК/nowaito.git
echo.
echo 3. Затем выполните:
echo    git push -u origin main
echo.
echo ==========================================
pause
