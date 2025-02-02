@echo off
:: Красивий зелений колір
color 0A
chcp 65001 >nul

set LOGFILE=start.log
set PROXY_FILE=proxy.txt

:: Запобігаємо блокуванню файлу логів
if exist %LOGFILE% del /F /Q %LOGFILE%

echo ============================== >> %LOGFILE%
echo Запуск: %DATE% %TIME% >> %LOGFILE%
echo ============================== >> %LOGFILE%

:: Перевірка залежностей
set MISSING=0
set "NODE_MISSING="
set "GIT_MISSING="
set "NGROK_MISSING="

where node >nul 2>nul || (set /a MISSING+=1 & set "NODE_MISSING=1")
where git >nul 2>nul || (set /a MISSING+=1 & set "GIT_MISSING=1")
where ngrok >nul 2>nul || (set /a MISSING+=1 & set "NGROK_MISSING=1")

if %MISSING% NEQ 0 (
    echo 🔍 Виявлено відсутні залежності...
    where choco >nul 2>nul || (
       echo ❌ Chocolatey не знайдено. Будь ласка, встанови його за: https://chocolatey.org/install
       pause
       exit /b
    )
    if defined NODE_MISSING (
       echo ⏳ Встановлюю Node.js...
       choco install nodejs -y >> %LOGFILE% 2>&1
    )
    if defined GIT_MISSING (
       echo ⏳ Встановлюю Git...
       choco install git -y >> %LOGFILE% 2>&1
    )
    if defined NGROK_MISSING (
       echo ⏳ Встановлюю ngrok...
       choco install ngrok -y >> %LOGFILE% 2>&1
    )
)

echo ✅ Усі необхідні програми встановлені.
echo ✅ Усі необхідні програми встановлені. >> %LOGFILE%

:: Вбиваємо старі процеси
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM ngrok.exe /T >nul 2>&1

:: Чистимо старі логи
if exist ngrok.log del /F /Q ngrok.log

:: 🔍 Перевіряємо робочі проксі
if exist %PROXY_FILE% (
    echo 🔄 Перевіряю старі проксі...
    echo "" > temp_proxy.txt
    for /f "delims=" %%i in (%PROXY_FILE%) do (
        curl -s -o nul -w "%%i {http_code}" %%i | findstr /C:"200" >nul && echo %%i >> temp_proxy.txt
    )
    move /Y temp_proxy.txt %PROXY_FILE% >nul
    echo ✅ Робочі проксі залишені, неробочі видалені.
    timeout /t 1 >nul
) else (
    echo 🔍 Файл proxy.txt не знайдено, створюю новий...
    echo "" > %PROXY_FILE%
)

:: Запускаємо CORS Anywhere
echo 🔄 Запускаю CORS Anywhere...
start /min cmd /c "node C:\Users\1206m\AppData\Roaming\npm\node_modules\cors-anywhere\server.js --port 8080 --cors-anywhere.allow-origin '*' --cors-anywhere.require-header '' >> %LOGFILE% 2>&1"
timeout /t 5 /nobreak >nul

:: Запускаємо ngrok
echo 🔄 Запускаю ngrok...
start /min cmd /c "ngrok http 8080 > ngrok.log 2>&1"

:: Очікуємо отримання URL з API ngrok
set "NGROK_URL="
set /a RETRIES=20
:WaitForNgrokApi
timeout /t 2 /nobreak >nul

for /f "delims=" %%i in ('powershell -noprofile -command "try { (Invoke-WebRequest -Uri \"http://127.0.0.1:4040/api/tunnels\" -UseBasicParsing).Content | ConvertFrom-Json | Select-Object -ExpandProperty tunnels | Where-Object { $_.public_url -match \"https://.*ngrok-free.app\" } | Select-Object -ExpandProperty public_url } catch { }"') do (
    set "NGROK_URL=%%i"
)

if "%NGROK_URL%"=="" (
    set /a RETRIES-=1
    if %RETRIES% GTR 0 goto WaitForNgrokApi
)

if "%NGROK_URL%"=="" (
    echo ❌ Помилка: не вдалося отримати ngrok URL!
    echo ❌ Помилка: не вдалося отримати ngrok URL! >> %LOGFILE%
    pause
    exit /b
)

:: ✅ Додаємо новий проксі в proxy.txt без видалення старих
(
    echo %NGROK_URL%
) >> %PROXY_FILE%

echo ✅ Додано новий Proxy URL: %NGROK_URL%
echo ✅ Додано новий Proxy URL: %NGROK_URL% >> %LOGFILE%
timeout /t 1 >nul

:: Оновлення Git-репозиторію
echo 🔄 Оновлюю Git...
git pull --rebase
timeout /t 1 >nul
git add %PROXY_FILE%
timeout /t 1 >nul
git commit -m "Auto-update proxy URL"
timeout /t 1 >nul
git push origin main

echo.
echo ✅ Все оновлено та запущено!
echo ✅ Все оновлено та запущено! >> %LOGFILE%
pause
