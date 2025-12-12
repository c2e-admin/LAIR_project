// !!! ВСТАВТЕ СЮДИ ВАШ URL ВЕБ-ДОДАТКА З КРОКУ 1.3 !!!
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxpxXWq8zhMM0ifO_cgZavHgrUq96RhlNy4aLA5qL0enEFpX4Luk7Xgf88S8s-cpHvlWg/exec'; 

// Базові ціни за добу (₴)
const PRICES = {
    laptop: 1050,
    ps5: 500,
    vr: 550,
    // Додайте інші пристрої тут (монітор, стіл, крісло, ДБЖ)
    // monitor: 350, table: 150, ...
};

// Вартість додаткових послуг
const SERVICE_PRICES = {
    location: 900,
    priority: 300,
};

// Знижки за тривалість (%)
const DISCOUNTS = {
    3: 0.10, // 10% за 3 дні
    7: 0.15, // 15% за 7 днів
    // Додайте свої знижки (наприклад, 0.25 за 5+ днів і більше)
};


// ----- ФУНКЦІЯ РОЗРАХУНКУ -----
function calculatePrice() {
    const days = parseInt(document.getElementById('durationDays').value) || 0;
    const qtyLaptop = parseInt(document.getElementById('qtyLaptop').value) || 0;
    const qtyPS5 = parseInt(document.getElementById('qtyPS5').value) || 0;
    const qtyVR = parseInt(document.getElementById('qtyVR').value) || 0;
    // ... Збір інших кількостей ...
    
    if (days < 1) {
        document.getElementById('basePrice').textContent = '0 ₴';
        document.getElementById('finalPrice').textContent = '0 ₴';
        return;
    }

    let baseDailyPrice = (qtyLaptop * PRICES.laptop) + (qtyPS5 * PRICES.ps5) + (qtyVR * PRICES.vr);
    // ... Додавання інших пристроїв до baseDailyPrice ...

    let baseTotalPrice = baseDailyPrice * days;
    let totalDiscount = 0;
    let finalDiscountValue = 0;
    let servicesTotal = 0;
    let orderedItems = [];

    // 1. Знижка за Тривалість
    if (days >= 7) {
        totalDiscount = DISCOUNTS[7];
    } else if (days >= 3) {
        totalDiscount = DISCOUNTS[3];
    }
    finalDiscountValue = baseTotalPrice * totalDiscount;

    // 2. Додаткові Послуги
    if (document.getElementById('serviceLocation').checked) {
        servicesTotal += SERVICE_PRICES.location;
    }
    if (document.getElementById('servicePriority').checked) {
        servicesTotal += SERVICE_PRICES.priority;
    }

    // 3. Формування Списку Замовлення (для надсилання в Таблицю)
    if (qtyLaptop > 0) orderedItems.push(`Ноутбук: ${qtyLaptop} шт.`);
    if (qtyPS5 > 0) orderedItems.push(`PS5: ${qtyPS5} шт.`);
    if (qtyVR > 0) orderedItems.push(`VR: ${qtyVR} шт.`);
    
    // 4. Фінальний Розрахунок
    let finalPrice = baseTotalPrice - finalDiscountValue + servicesTotal;
    
    // 5. Розрахунок Застави (спрощений варіант, виходячи з мінімальної)
    const depositAmount = (qtyLaptop + qtyPS5 + qtyVR > 0) ? 500 : 0; 
    
    // 6. Оновлення інтерфейсу
    document.getElementById('basePrice').textContent = `${baseTotalPrice.toFixed(0)} ₴`;
    document.getElementById('discountValue').textContent = `${finalDiscountValue.toFixed(0)} ₴`;
    document.getElementById('servicesPrice').textContent = `${servicesTotal.toFixed(0)} ₴`;
    document.getElementById('finalPrice').textContent = `${finalPrice.toFixed(0)} ₴`;
    document.getElementById('depositAmount').textContent = `${depositAmount.toFixed(0)} ₴`;

    // Зберігаємо список пристроїв у приховане поле для відправки
    document.getElementById('orderForm').setAttribute('data-items', orderedItems.join('; '));
    document.getElementById('orderForm').setAttribute('data-final-price', finalPrice.toFixed(0));
    document.getElementById('orderForm').setAttribute('data-deposit-amount', depositAmount.toFixed(0));
}

// ----- ФУНКЦІЯ ВІДПРАВКИ ФОРМИ -----
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitButton = document.getElementById('submitButton');
    const messageElement = document.getElementById('message');
    
    // Виконати фінальний розрахунок перед відправкою
    calculatePrice();

    if (parseFloat(document.getElementById('finalPrice').textContent) <= 0) {
         alert('Будь ласка, оберіть пристрої для оренди.');
         return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Обробка...';

    const formData = {
        ClientName: document.getElementById('clientName').value,
        ClientPhone: document.getElementById('clientPhone').value,
        ClientCity: document.getElementById('clientCity').value,
        DurationDays: document.getElementById('durationDays').value,
        
        // Дані з розрахунку
        ItemsList: this.getAttribute('data-items'),
        FinalPrice: this.getAttribute('data-final-price'),
        DepositAmount: this.getAttribute('data-deposit-amount'),

        // Додаткові послуги
        ServiceLocation: document.getElementById('serviceLocation').checked,
        ServicePriority: document.getElementById('servicePriority').checked,
    };

    try {
        // Відправка даних у Google Apps Script
        const response = await fetch(GOOGLE_APP_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors', 
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(formData),
        });

        const result = await response.json();

        if (result.result === 'success') {
            messageElement.textContent = '✅ Замовлення успішно прийнято! Ми звʼяжемося з Вами.';
            this.reset(); // Очищення форми
            calculatePrice(); // Очищення підсумку
        } else {
            messageElement.textContent = `❌ Помилка при оформленні: ${result.message}`;
            messageElement.style.color = 'red';
        }

    } catch (error) {
        console.error('Fetch error:', error);
        messageElement.textContent = '❌ Не вдалося зв\'язатися з сервером. Спробуйте пізніше.';
        messageElement.style.color = 'red';
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Оформити Замовлення';
    }
});

// Запуск розрахунку при завантаженні сторінки
document.addEventListener('DOMContentLoaded', calculatePrice);