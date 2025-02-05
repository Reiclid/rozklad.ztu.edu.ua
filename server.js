const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const tough = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

const cookieJar = new tough.CookieJar();
const client = wrapper(axios.create({ jar: cookieJar, withCredentials: true }));

const app = express();
const PORT = process.env.PORT || 8080;

const activeSessions = {}; // Глобальний об'єкт для збереження сесій

// 🔹 Список дозволених доменів
const corsOptions = {
    origin: [
        "http://localhost:8080",
        "https://rozklad.ztu.edu.ua",
        "https://rozkladztu.pp.ua",
        "https://cute-milzie-reiclidco-104afda1.koyeb.app"
    ],
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // ✅ Дозволяє всі методи
    allowedHeaders: ["Content-Type", "Authorization"] // ✅ Дозволяє певні заголовки
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());  // 📌 Парсимо куки
app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false, // ❌ Не створювати сесію без потреби
    cookie: {
        secure: true, // Постав `true`, якщо HTTPS
        httpOnly: true,
        sameSite: "lax"
    }
}));

// 📌 Додаємо логування всіх запитів
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Статичні файли
app.use(express.static(path.join(__dirname, "public")));

// Проксі-маршрут для перенаправлення запитів
app.get("/proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send("❌ Помилка: URL не вказано!");
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Cookie": "PHPSESSID=huy" // 🔹 Передаємо кукі
            },
            withCredentials: true // 🔹 Передаємо credentials
        });

        res.set({
            "Access-Control-Allow-Origin": req.headers.origin, // 🔹 Динамічне визначення
            "Access-Control-Allow-Credentials": "true"
        });

        res.send(response.data);
    } catch (error) {
        console.error("❌ Помилка отримання даних:", error.message);
        res.status(500).send("❌ Помилка отримання даних з " + targetUrl);
    }
});

// 📌 Проксі-запит з передачею куків
app.get("/api/login", async (req, res) => {
    try {
        console.log("📡 Отримані кукі з браузера:", req.headers.cookie);

        // Виконуємо запит з куками
        const response = await client.get("https://cabinet.ztu.edu.ua/site/schedule", {
            headers: {
                "User-Agent": req.headers["user-agent"],
                "Cookie": req.headers.cookie,
                "Referer": "https://cabinet.ztu.edu.ua/"
            }
        });

        // Перевіряємо, чи сервер повернув сторінку логіну
        if (response.data.includes('<a href="/site/login">Увійти</a>')) {
            console.warn("⚠️ Користувач не авторизований");
            return res.status(401).json({ success: false, error: "Авторизуйтесь в кабінеті ЖДУ" });
        }

        console.log("✅ Авторизація успішна!");
        
        // Зберігаємо куки у сесії
        req.session.authCookies = await cookieJar.getCookies("https://cabinet.ztu.edu.ua");


        console.log("📡 Збережені сесійні кукі:", req.session.authCookies);

        res.json({ success: true, message: "Автентифікація успішна", schedule: response.data });
    } catch (error) {
        console.error("❌ Помилка при автентифікації:", error.message);
        res.status(500).json({ error: "Помилка сервера при спробі автентифікації" });
    }
});




// 📌 Ендпоінт для автологіну
app.get("/api/auto-login", async (req, res) => {
    if (!req.headers.cookie) {
        return res.status(401).json({ success: false, error: "❌ Немає cookies. Авторизуйтеся в браузері!" });
    }

    try {
        console.log("📡 Перевіряємо автологін...");

        const response = await axios.get("https://cabinet.ztu.edu.ua/site/schedule", {
            headers: {
                "User-Agent": req.headers["user-agent"],
                "Cookie": req.headers.cookie,
                "Referer": "https://cabinet.ztu.edu.ua/"
            },
            withCredentials: true
        });

        if (response.data.includes('<a href="/site/login">Увійти</a>')) {
            console.warn("⚠ Сервер перенаправив на логін. Користувач НЕ авторизований.");
            return res.status(401).json({ success: false, error: "❌ Автологін не вдався!" });
        }

        if (response.status === 200 && response.data.includes("Розклад")) {
            console.log("✅ Автологін успішний!");
            res.json({ success: true, message: "Автологін успішний!", schedule: response.data });
        } else {
            console.warn("⚠ Автологін НЕ вдався.");
            res.status(401).json({ success: false, error: "❌ Автологін не вдався!" });
        }
    } catch (error) {
        console.error("❌ Помилка автологіну:", error.message);
        res.status(500).json({ error: "❌ Помилка автологіну" });
    }
});

// 📌 Проксі-ендпоінт для отримання розкладу
app.get("/api/schedule", async (req, res) => {
    const { week, day } = req.query;

    // 📌 Перевіряємо, чи є збережені кукі
    const savedCookies = req.session.authCookies;
    if (!savedCookies) {
        return res.status(401).json({ error: "❌ Немає збережених кукі. Авторизуйтеся!" });
    }

    try {
        console.log("📡 Запитуємо розклад...", `week=${week}&day=${day}`);

        const response = await axios.get(`https://cabinet.ztu.edu.ua/site/schedule?week=${week}&day=${day}`, {
            headers: {
                "User-Agent": req.headers["user-agent"],
                "Cookie": savedCookies, // 🔹 Передаємо збережені кукі
                "Referer": "https://cabinet.ztu.edu.ua/"
            },
            withCredentials: true
        });

        // 📌 Перевіряємо, чи сервер не пересилає на логін
        if (response.data.includes('<a href="/site/login">Увійти</a>')) {
            console.warn("⚠ Сервер перенаправив на логін.");
            return res.status(401).json({ error: "❌ Ви не залогінені!" });
        }

        res.set({
            "Access-Control-Allow-Origin": req.headers.origin,
            "Access-Control-Allow-Credentials": "true"
        });

        res.send(response.data);
    } catch (error) {
        console.error("❌ Помилка отримання розкладу:", error.message);
        res.status(500).json({ error: "❌ Не вдалося отримати розклад" });
    }
});






// 📌 Віддаємо `index.html`
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 📌 Запускаємо сервер
app.listen(PORT, () => {
    console.log(`🚀 Сервер працює на порту ${PORT}`);
});

