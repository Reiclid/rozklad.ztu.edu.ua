const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// Використовуємо CORS
app.use(cors());

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

// Віддаємо index.html за замовчуванням при відкритті кореневого маршруту
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Запускаємо сервер
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});

