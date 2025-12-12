// !!! ВСТАВТЕ СЮДИ ВАШ URL ВЕБ-ДОДАТКА З КРОКУ 1.3 !!!
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxpxXWq8zhMM0ifO_cgZavHgrUq96RhlNy4aLA5qL0enEFpX4Luk7Xgf88S8s-cpHvlWg/exec'; 

// Базові тарифи
const RATES = {
    HOURLY: { // Погодинна оренда
        laptop: 310, 
        ps5: 250,
        vr: 260,
        minTime: 4 // Мінімум 4 години
    },
    DAILY: { // Добова оренда
        laptop: 1050,
        ps5: 500,
        vr: 550,
        minTime: 1 // Мінімум 1 день
    }
};

const SERVICE_PRICES = {
    location: 900,
    priority: 300,
};

// Знижки за тривалість (для добової оренди)
const DAILY_DISCOUNTS = {
    3: 0.10, // 10% за 3 дні
    7: 0.15, // 15% за 7 днів
};

// ----- 1. ФУНКЦІЯ ВАЛІДАЦІЇ -----
function validateField(fieldId, regex, errorMessage) {
    const field = document.getElementById(fieldId);
    const value = field.value.trim();
    const isValid = regex.test(value);

    if (!isValid) {
        field.classList.add('invalid');
        alert(errorMessage); 
    } else {
        field.classList.remove('invalid');
    }
    return isValid;
}

function validateForm(isSubmit = false) {
    let isValid = true;
    
    // 1. Валідація Імені (Тільки кирилиця/латиниця, пробіли, дефіси)
    isValid &= validateField('clientName', /^[A-Za-zА-Яа-яЄєІіЇї\s\-]+$/, "Ім'я може містити лише літери та пробіли.");

    // 2. Валідація Телефону (Український формат +380 або 0ХХ)
    isValid &= validateField('clientPhone', /^(\+380|0)\d{9}$/, "Невірний формат українського номеру телефону (використовуйте +380XXXXXXXXX або 0XXXXXXXXX).");

    // 3. Валідація Міста
    if (document.getElementById('clientCity').value === '') {
        document.getElementById('clientCity').classList.add('invalid');
        if (isSubmit) alert("Будь ласка, оберіть місто.");
        isValid = false;
    } else {
        document.getElementById('clientCity').classList.remove('invalid');
    }
    
    return isValid;
}


// ----- 2. ОСНОВНА ФУНКЦІЯ РОЗРАХУНКУ -----
function calculatePrice() {
    // Вхідні дані
    const isHourly = document.getElementById('rentalTypeHourly').checked;
    const unitTime = parseInt(document.getElementById('durationTime').value) || 0;
    const rates = isHourly ? RATES.HOURLY : RATES.DAILY;
    const timeUnitName = isHourly ? 'годин' : 'днів';
    
    const qtyLaptop = parseInt(document.getElementById('qtyLaptop').value) || 0;
    const qtyPS5 = parseInt(document.getElementById('qtyPS5').value) || 0;
    const qtyVR = parseInt(document.getElementById('qtyVR').value) || 0;
    
    // Перевірка мінімального часу оренди
    if (unitTime < rates.minTime && (qtyLaptop + qtyPS5 + qtyVR > 0)) {
        alert(`Мінімальний час оренди для ${isHourly ? 'погодинного' : 'добового'} тарифу складає ${rates.minTime} ${timeUnitName}.`);
        document.getElementById('finalPrice').textContent = '0 ₴';
        return;
    }
    
    // 1. Базова вартість обладнання
    let baseDailyRate = (qtyLaptop * rates.laptop) + (qtyPS5 * rates.ps5) + (qtyVR * rates.vr);
    let baseTotalPrice = baseDailyRate * unitTime;
    
    let totalDiscount = 0;
    let servicesTotal = 0;
    let orderedItems = [];

    // 2. Знижка за Тривалість (ТІЛЬКИ для добової оренди)
    if (!isHourly) {
        if (unitTime >= 7) {
            totalDiscount = DAILY_DISCOUNTS[7];
        } else if (unitTime >= 3) {
            totalDiscount = DAILY_DISCOUNTS[3];
        }
    }
    let finalDiscountValue = baseTotalPrice * totalDiscount;

    // 3. Додаткові Послуги
    if (document.getElementById('serviceLocation').checked) {
        servicesTotal += SERVICE_PRICES.location;
    }
    if (document.getElementById('servicePriority').checked) {
        servicesTotal += SERVICE_PRICES.priority;
    }

    // 4. Формування Списку Замовлення
    if (qtyLaptop > 0) orderedItems.push(`Ноутбук: ${qtyLaptop} шт.`);
    if (qtyPS5 > 0) orderedItems.push(`PS5: ${qtyPS5} шт.`);
    if (qtyVR > 0) orderedItems.push(`VR: ${qtyVR} шт.`);
    
    // 5. Фінальний Розрахунок
    let finalPrice = baseTotalPrice - finalDiscountValue + servicesTotal;
    
    // 6. Розрахунок Застави
    const depositAmount = (qtyLaptop + qtyPS5 + qtyVR > 0) ? 500 : 0; 
    
    // 7. Оновлення інтерфейсу
    document.getElementById('timeUnitLabel').textContent = timeUnitName;
    document.getElementById('basePrice').textContent = `${baseTotalPrice.toFixed(0)} ₴`;
    document.getElementById('discountValue').textContent = `${finalDiscountValue.toFixed(0)} ₴`;
    document.getElementById('servicesPrice').textContent = `${servicesTotal.toFixed(0)} ₴`;
    document.getElementById('finalPrice').textContent = `${finalPrice.toFixed(0)} ₴`;
    document.getElementById('depositAmount').textContent = `${depositAmount.toFixed(0)} ₴`;

    // Зберігання даних для відправки
    const form = document.getElementById('orderForm');
    form.setAttribute('data-items', orderedItems.join('; '));
    form.setAttribute('data-final-price', finalPrice.toFixed(0));
    form.setAttribute('data-deposit-amount', depositAmount.toFixed(0));
    form.setAttribute('data-time-unit', timeUnitName);
}

// ----- 3. ВІДПРАВКА ФОРМИ -----
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!validateForm(true)) return; // Фінальна валідація
    
    // ... (тут залишається логіка відправки, як у попередньому відповіді, 
    // але використовуємо GOOGLE_APP_SCRIPT_URL та збираємо додатково Time Unit)
    // ...
    // !!! Для відправки в GAS вам потрібно буде додати:
    // DurationDays: document.getElementById('durationTime').value + ' ' + this.getAttribute('data-time-unit'),
    // ...
});

// Додавання обробників подій до нових елементів
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('rentalTypeHourly').addEventListener('change', calculatePrice);
    document.getElementById('rentalTypeDaily').addEventListener('change', calculatePrice);
    
    // Додаємо обробку подій для перевірки валідності в реальному часі
    document.getElementById('clientName').addEventListener('input', () => validateField('clientName', /^[A-Za-zА-Яа-яЄєІіЇї\s\-]+$/, "Ім'я може містити лише літери та пробіли."));
    document.getElementById('clientPhone').addEventListener('input', () => validateField('clientPhone', /^(\+380|0)\d{9}$/, "Невірний формат номеру."));

    calculatePrice();
});

// Примусове обчислення для коректного відображення початкових значень
document.addEventListener('DOMContentLoaded', calculatePrice);