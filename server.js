const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 8080;

// Використовуємо CORS
app.use(cors());

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

// Запускаємо сервер
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});

