#!/bin/bash

echo "🔄 Встановлюємо залежності..."
npm install cors-anywhere

echo "🚀 Запускаємо CORS Anywhere..."
node node_modules/cors-anywhere/server.js --port 8080 --cors-anywhere.allow-origin '*' --cors-anywhere.require-header '' &

echo "🌍 Завантажуємо та запускаємо ngrok..."
curl -s https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip -o ngrok.zip && unzip ngrok.zip
chmod +x ngrok
./ngrok http 8080 > ngrok.log &

sleep 5  # Очікуємо, поки ngrok запуститься

echo "🔍 Отримуємо ngrok URL..."
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "$NGROK_URL" >> proxy.txt
echo "✅ Отриманий URL: $NGROK_URL"

echo "📤 Оновлюємо Git..."
git fetch origin
git checkout -b main origin/main

git config --global user.email "reiclid@gmail.com"
git config --global user.name "Reiclid"

git pull origin main
git add proxy.txt
git commit -m "Auto-update proxy URL"
git push origin main

echo "🎉 Успішно запущено! Тепер працює 24/7."
tail -f /dev/null
