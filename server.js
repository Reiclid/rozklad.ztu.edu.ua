const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

const activeSessions = {}; // Глобальний об'єкт для збереження сесій

// Використовуємо CORS
app.use(cors());
app.use(bodyParser.json());

// Налаштовуємо статичну роздачу файлів з папки "public"
app.use(express.static(path.join(__dirname, "public")));

// Проксі-маршрут для перенаправлення запитів
app.get("/proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send("❌ Помилка: URL не вказано!");
    }

    try {
        const response = await axios.get(targetUrl);
        res.send(response.data);
    } catch (error) {
        res.status(500).send("❌ Помилка отримання даних з " + targetUrl);
    }
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "❌ Введіть логін і пароль" });
    }


    try {
        console.log("🚀 Запускаємо Puppeteer...");
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log("🔄 Відкриваємо сайт авторизації...");
        await page.goto("https://cabinet.ztu.edu.ua/site/login", { waitUntil: "networkidle2" });

        console.log("📌 Вводимо логін...");
        await page.type("#loginform-username", username);
        await page.type("#loginform-password", password);

        console.log("🚀 Натискаємо кнопку входу...");
        await Promise.all([
            page.click('button[name="login-button"]'),
            page.waitForNavigation({ waitUntil: "networkidle2" })
        ]);

        console.log("✅ Авторизація успішна!");

        // Отримуємо cookies після логіну
        const cookies = await page.cookies();
        console.log("📌 Збережені cookies:", cookies);

        // Генеруємо унікальний токен сесії
        const sessionToken = Math.random().toString(36).substr(2);

        // Зберігаємо cookies у `activeSessions`
        activeSessions[sessionToken] = { cookies };

        console.log("📅 Переходимо на розклад...");
        await page.goto("https://cabinet.ztu.edu.ua/site/schedule", { waitUntil: "networkidle2" });

        console.log("📌 Отримуємо HTML розкладу...");
        const scheduleHtml = await page.content();

        console.log("✅ Завантажили розклад!");
        await browser.close();

        // Повертаємо токен сесії + розклад
        res.json({ success: true, token: sessionToken, schedule: scheduleHtml, cookies });

    } catch (error) {
        console.error("❌ Помилка входу:", error);
        res.status(500).json({ error: "Не вдалося авторизуватися" });
    }
});


app.post("/api/auto-login", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !activeSessions[token]) {
        return res.status(401).json({ success: false, error: "Токен недійсний або відсутній" });
    }

    try {
        console.log(`📌 Використовуємо cookies для отримання розкладу...`);

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Встановлюємо cookies
        await page.setCookie(...activeSessions[token].cookies);

        console.log("📅 Завантажуємо розклад...");
        await page.goto("https://cabinet.ztu.edu.ua/site/schedule", { waitUntil: "networkidle2" });
        const scheduleHtml = await page.content();

        await browser.close();

        res.json({ success: true, schedule: scheduleHtml });

    } catch (error) {
        console.error("❌ Помилка авто-входу:", error);
        res.status(500).json({ success: false, error: "Помилка авто-входу" });
    }
});

app.post("/api/schedule", async (req, res) => {
    const { week, day } = req.body;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token || !activeSessions[token]) {
        return res.status(401).json({ success: false, error: "Токен недійсний або відсутній" });
    }

    try {
        console.log(`📌 Використовуємо cookies для отримання розкладу (Тиждень ${week}, День ${day})`);

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Встановлюємо cookies для сесії
        await page.setCookie(...activeSessions[token].cookies);

        console.log("📅 Завантажуємо розклад...");
        await page.goto(`https://cabinet.ztu.edu.ua/site/schedule?week=${week}&day=${day}`, { waitUntil: "networkidle2" });

        console.log("📌 Отримуємо HTML розкладу...");
        const scheduleHtml = await page.evaluate(() => document.documentElement.outerHTML);

        await browser.close();

        res.json({ success: true, schedule: scheduleHtml });

    } catch (error) {
        console.error("❌ Помилка отримання розкладу:", error);
        res.status(500).json({ success: false, error: "Помилка отримання розкладу" });
    }
});



// Віддаємо index.html за замовчуванням при відкритті кореневого маршруту
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Запускаємо сервер
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});

