#!/bin/bash

echo "🔄 Встановлюємо залежності..."
apt update && apt install -y curl git unzip jq
npm install -g cors-anywhere
curl -s https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip -o ngrok.zip && unzip ngrok.zip && mv ngrok /usr/local/bin

echo "🚀 Запускаємо CORS Anywhere..."
cors-anywhere --port 8080 --cors-anywhere.allow-origin '*' --cors-anywhere.require-header '' &

echo "🌍 Запускаємо ngrok..."
ngrok http 8080 > ngrok.log &
sleep 5

echo "🔍 Отримуємо ngrok URL..."
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "$NGROK_URL" >> proxy.txt
echo "✅ Отриманий URL: $NGROK_URL"

echo "📤 Оновлюємо Git..."
git config --global user.email "reiclid@gmail.com"
git config --global user.name "Reiclid"
git pull --rebase
git add proxy.txt
git commit -m "Auto-update proxy URL"
git remote set-url origin git@github.com:Reiclid/rozklad.ztu.edu.ua.git
git push origin main

echo "🎉 Успішно запущено! Тепер працює 24/7."

# Тримаємо процес активним
while true; do sleep 30; done
