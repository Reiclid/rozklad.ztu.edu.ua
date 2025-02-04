function updateCardEffects() {
    const cards = document.querySelectorAll('.schedule-card');
    const viewportHeight = window.innerHeight;

    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportHeight / 2;

        // Відстань від центру екрану
        const distanceFromCenter = cardCenter - viewportCenter;

        // Нормалізована відстань від центру (-1 = верх, 1 = низ)
        const normalizedDistance = distanceFromCenter / viewportHeight;

        // Визначаємо масштаб (від 1 до 0.8)
        let scale = 1 - Math.min(Math.abs(normalizedDistance) * 0.2, 0.2);

        // Визначаємо кут нахилу (від -20deg до 20deg)
        // let tilt = Math.min(Math.max(normalizedDistance * 20, -20), 20);

        // Додаємо клас для плавної анімації
        if (Math.abs(normalizedDistance) < 0.5) {
            card.classList.add('in-view');
        } else {
            card.classList.remove('in-view');
        }

        // Застосовуємо стилі
        card.style.transform = `scale(${scale})`;
        card.style.opacity = scale * scale;
    });
}

// Викликаємо оновлення при прокручуванні
window.addEventListener('scroll', updateCardEffects);
window.addEventListener('resize', updateCardEffects);
document.addEventListener('DOMContentLoaded', updateCardEffects);



function toggleLogin() {
    const form = document.querySelector(".LoginForm");
    form.style.display = form.style.display === "block" ? "none" : "block";
}

function toggleClear() {
    const clearDivalert = document.querySelector(".clearDivalert");
    clearDivalert.style.display = clearDivalert.style.display === "flex" ? "none" : "flex";
}