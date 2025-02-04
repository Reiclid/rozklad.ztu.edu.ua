FROM node:20-bullseye

# Встановлюємо потрібні системні бібліотеки
RUN apt-get update && apt-get install -y \
    libatk1.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libnspr4 \
    fonts-liberation \
    libfontconfig1 \
    libxcursor1 \
    libxss1 \
    libxtst6 \
    libx11-6 \
    libxext6 \
    libglib2.0-0 \
    ca-certificates \
    curl \
    unzip \
    wget \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Встановлюємо залежності Puppeteer
RUN npm install puppeteer --omit=dev

# Копіюємо код
WORKDIR /app
COPY . .

# Запускаємо сервер
CMD ["node", "server.js"]
