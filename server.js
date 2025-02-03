const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;

// Використовуємо CORS
app.use(cors());

// Маршрут для перевірки роботи сервера
app.get("/", (req, res) => {
    res.send("✅ Сервер працює!");
});

// Запускаємо сервер
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});
