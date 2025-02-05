const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 8080;

// 🔹 Фікс CORS на Koyeb
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax"
    }
}));

// 📌 Проксі для API
app.get("/proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("❌ Помилка: URL не вказано!");

    try {
        const response = await axios.get(targetUrl, {
            headers: { "User-Agent": req.headers["user-agent"], "Cookie": req.headers.cookie },
            withCredentials: true
        });

        res.set({
            "Access-Control-Allow-Origin": req.headers.origin || "*",
            "Access-Control-Allow-Credentials": "true"
        });

        res.send(response.data);
    } catch (error) {
        console.error("❌ Помилка отримання даних:", error.message);
        res.status(500).send("❌ Помилка отримання даних з " + targetUrl);
    }
});

// 📌 Авторизація
app.get("/api/login", async (req, res) => {
    try {
        console.log("📡 Отримані кукі з браузера:", req.headers.cookie);

        const response = await axios.get("https://cabinet.ztu.edu.ua/site/schedule", {
            headers: { "User-Agent": req.headers["user-agent"], "Cookie": req.headers.cookie }
        });

        if (response.data.includes('<a href="/site/login">Увійти</a>')) {
            console.warn("⚠️ Користувач не авторизований");
            return res.status(401).json({ success: false, error: "Авторизуйтесь в кабінеті ЖДУ" });
        }

        console.log("✅ Авторизація успішна!");
        req.session.authCookies = req.headers.cookie;
        res.json({ success: true, message: "Автентифікація успішна", schedule: response.data });
    } catch (error) {
        console.error("❌ Помилка при автентифікації:", error.message);
        res.status(500).json({ error: "Помилка сервера при спробі автентифікації" });
    }
});

// 📌 Отримання розкладу
app.get("/api/schedule", async (req, res) => {
    if (!req.session.authCookies) return res.status(401).json({ error: "❌ Немає збережених кукі. Авторизуйтеся!" });

    try {
        const response = await axios.get(`https://cabinet.ztu.edu.ua/site/schedule`, {
            headers: { "User-Agent": req.headers["user-agent"], "Cookie": req.session.authCookies },
            withCredentials: true
        });

        if (response.data.includes('<a href="/site/login">Увійти</a>')) {
            console.warn("⚠ Сервер перенаправив на логін.");
            return res.status(401).json({ error: "❌ Ви не залогінені!" });
        }

        res.send(response.data);
    } catch (error) {
        console.error("❌ Помилка отримання розкладу:", error.message);
        res.status(500).json({ error: "❌ Не вдалося отримати розклад" });
    }
});

app.listen(PORT, () => console.log(`🚀 Сервер працює на порту ${PORT}`));
