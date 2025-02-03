#!/bin/bash

echo "🔄 Встановлюємо залежності..."
apt-get update && apt-get install -y jq curl unzip

echo "🚀 Встановлюємо та запускаємо CORS Anywhere..."
npm install -g cors-anywhere
cors-anywhere --port 8080 --cors-anywhere.allow-origin '*' --cors-anywhere.require-header '' &

echo "🌍 Завантажуємо та запускаємо ngrok..."
curl -s https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip -o ngrok.zip
unzip -o ngrok.zip
chmod +x ngrok
mv ngrok /usr/bin/ngrok
ngrok http 8080 > ngrok.log 2>&1 &

sleep 5  # Чекаємо, щоб ngrok встиг запуститися

echo "🔍 Отримуємо ngrok URL..."
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [ -z "$NGROK_URL" ]; then
    echo "❌ Помилка: ngrok URL не отримано!"
    cat ngrok.log
    exit 1
fi

echo "✅ Отриманий URL: $NGROK_URL"
echo "$NGROK_URL" >> proxy.txt

echo "📤 Оновлюємо Git..."

git config --global user.email "reiclid@gmail.com"
git config --global user.name "Reiclid"

git pull --rebase
git add proxy.txt
git commit -m "Auto-update proxy URL"
git push origin main

echo "🎉 Успішно запущено! Тепер працює 24/7."
tail -f /dev/null
