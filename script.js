'use strict';

/* ===== Работа с localStorage (с защитой от ошибок в приватном режиме) ===== */
function loadData(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch {
        return fallback;
    }
}

function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* хранилище недоступно — просто не сохраняем */
    }
}

/* ===== Общие модули для всех страниц ===== */

// Кнопка «Наверх» появляется после прокрутки на 300 px
function initToTop() {
    const toTop = document.querySelector('.to-top');
    if (!toTop) return;
    const update = () => toTop.classList.toggle('visible', window.scrollY > 300);
    window.addEventListener('scroll', update, { passive: true });
    update();
}

// Бургер-меню закрывается по клику на пункт, по Escape и по клику вне меню
function initBurger() {
    const toggle = document.querySelector('.burger-toggle');
    const nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;

    nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => { toggle.checked = false; });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') toggle.checked = false;
    });
    document.addEventListener('click', (event) => {
        if (toggle.checked && !event.target.closest('.main-nav, .burger, .burger-toggle')) {
            toggle.checked = false;
        }
    });
}

function delay(f, ms) {
    return function (...args) {
        setTimeout(() => f.apply(this, args), ms);
    };
}

const NEW_NOTIFICATIONS = [
    { text: 'Скидка на курс Python', href: 'store.html' },
    { text: 'Новый курс по C#', href: 'store.html' },
    { text: 'Добавлены новые термины', href: 'terms.html' },
    { text: 'Пройдите тест ещё раз', href: 'quiz.html' },
];

// Уведомления: прочитанные запоминаются, новые приходят каждые 3 секунды
function initNotifications() {
    const counter = document.querySelector('.notify-count');
    const list = document.querySelector('.notify-list ul');
    const button = document.querySelector('.notify-btn');
    if (!counter || !list) return;

    const read = new Set(loadData('readNotifications', []));
    const render = () => {
        let unread = 0;
        list.querySelectorAll('a').forEach((link, index) => {
            const isRead = read.has(link.dataset.id);
            link.classList.toggle('is-read', isRead);
            link.querySelector('.num').textContent = index + 1;
            if (!isRead) unread++;
        });
        counter.textContent = unread;
        counter.hidden = unread === 0;
    };

    list.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (!link) return;
        read.add(link.dataset.id);
        saveData('readNotifications', [...read].filter((id) => !id.startsWith('new-')));
        render();
    });

    let added = 0;
    let pauses = 0;
    const resume = delay(() => { pauses--; }, 10000);

    button.addEventListener('click', () => {
        pauses++;
        resume();
    });

    setInterval(() => {
        if (pauses > 0) return;
        const { text, href } = NEW_NOTIFICATIONS[added % NEW_NOTIFICATIONS.length];
        const li = document.createElement('li');
        const link = document.createElement('a');
        const num = document.createElement('span');
        link.href = href;
        link.dataset.id = 'new-' + added++;
        num.className = 'num';
        link.append(num, text);
        li.append(link);
        list.prepend(li);
        if (list.children.length > 8) list.lastElementChild.remove();
        render();
    }, 3000);

    render();
}

function showNotification({ top = 90, right = 20, html, className = '' }) {
    const notification = document.createElement('div');
    notification.className = ('notification ' + className).trim();
    notification.style.top = top + 'px';
    notification.style.right = right + 'px';
    notification.innerHTML = html;
    document.body.append(notification);
    setTimeout(() => notification.remove(), 1500);
}

// Текущий год в подвале
function initYear() {
    const year = new Date().getFullYear();
    document.querySelectorAll('.current-year').forEach((el) => { el.textContent = year; });
}

/* ===== Главная: раскрытие текста новости ===== */
function initNews() {
    document.querySelectorAll('.news-element').forEach((news) => {
        const text = news.querySelector('.news-text p');
        const button = news.querySelector('.news-more');
        if (!text || !button) return;
        // Кнопка нужна, только если текст действительно обрезан
        if (text.scrollHeight <= text.clientHeight + 1) return;
        button.hidden = false;
        button.addEventListener('click', () => {
            const expanded = news.classList.toggle('expanded');
            button.textContent = expanded ? 'Свернуть' : 'Читать полностью';
            button.setAttribute('aria-expanded', expanded);
        });
    });
}

/* ===== Языки: фильтр по сфере и поиск ===== */
function initLanguageFilter() {
    const panel = document.querySelector('.filter-panel');
    if (!panel) return;
    const cards = document.querySelectorAll('.lang-card');
    const buttons = panel.querySelectorAll('.filter-btn');
    const search = panel.querySelector('#lang-search');
    const status = panel.querySelector('#lang-count');
    let category = 'all';

    const apply = () => {
        const query = search.value.trim().toLowerCase();
        let shown = 0;
        cards.forEach((card) => {
            const tags = card.dataset.tags.split(' ');
            const matchCategory = category === 'all' || tags.includes(category);
            const matchText = card.textContent.toLowerCase().includes(query);
            card.hidden = !(matchCategory && matchText);
            if (!card.hidden) shown++;
        });
        status.textContent = shown > 0 ? `Найдено языков: ${shown}` : 'Ничего не найдено';
    };

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            category = button.dataset.filter;
            buttons.forEach((b) => b.setAttribute('aria-pressed', b === button));
            apply();
        });
    });
    search.addEventListener('input', apply);

    panel.hidden = false;
    apply();
}

/* ===== Примеры кода: вкладки ===== */
function initTabs() {
    document.querySelectorAll('.tabs').forEach((tabs) => {
        const list = tabs.querySelector('[role="tablist"]');
        const buttons = [...tabs.querySelectorAll('[role="tab"]')];
        if (!list || buttons.length === 0) return;

        const select = (active, updateHash) => {
            buttons.forEach((button) => {
                const isActive = button === active;
                button.setAttribute('aria-selected', isActive);
                button.tabIndex = isActive ? 0 : -1;
                document.getElementById(button.getAttribute('aria-controls')).hidden = !isActive;
            });
            if (updateHash) history.replaceState(null, '', '#' + active.getAttribute('aria-controls'));
        };

        buttons.forEach((button, index) => {
            button.addEventListener('click', () => select(button, true));
            // Переключение стрелками влево/вправо
            button.addEventListener('keydown', (event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                const step = event.key === 'ArrowRight' ? 1 : -1;
                const next = buttons[(index + step + buttons.length) % buttons.length];
                next.focus();
                select(next, true);
            });
        });

        // Открываем вкладку из адреса (например, examples.html#ex-python)
        const fromHash = buttons.find((b) => '#' + b.getAttribute('aria-controls') === location.hash);
        list.hidden = false;
        select(fromHash || buttons[0], false);
    });
}

/* ===== Примеры кода: копирование в буфер обмена ===== */
function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    // Запасной вариант для старых браузеров и страниц без HTTPS
    return new Promise((resolve, reject) => {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        ok ? resolve() : reject(new Error('copy failed'));
    });
}

function initCopyButtons() {
    document.querySelectorAll('pre.code').forEach((pre) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrap';
        pre.before(wrapper);
        wrapper.append(pre);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'copy-btn';
        button.textContent = 'Копировать';
        wrapper.append(button);

        button.addEventListener('click', () => {
            copyText(pre.textContent)
                .then(() => { button.textContent = 'Скопировано!'; })
                .catch(() => { button.textContent = 'Ошибка'; })
                .finally(() => setTimeout(() => { button.textContent = 'Копировать'; }, 1500));
        });
    });
}

/* ===== Термины: поиск с подсветкой ===== */
function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function initTermSearch() {
    const box = document.querySelector('.terms-search');
    if (!box) return;
    const input = box.querySelector('#term-search');
    const status = box.querySelector('#term-count');
    const terms = document.querySelectorAll('.term');
    terms.forEach((term) => {
        const dt = term.querySelector('dt');
        dt.dataset.original = dt.textContent;
    });

    const apply = () => {
        const query = input.value.trim().toLowerCase();
        let shown = 0;
        terms.forEach((term) => {
            const dt = term.querySelector('dt');
            const title = dt.dataset.original;
            const match = term.textContent.toLowerCase().includes(query);
            term.hidden = !match;
            if (match) shown++;

            const pos = query ? title.toLowerCase().indexOf(query) : -1;
            dt.innerHTML = pos === -1
                ? escapeHtml(title)
                : escapeHtml(title.slice(0, pos)) + '<mark>' + escapeHtml(title.slice(pos, pos + query.length)) +
                '</mark>' + escapeHtml(title.slice(pos + query.length));
        });
        status.textContent = shown > 0 ? `Найдено терминов: ${shown} из ${terms.length}` : 'Ничего не найдено';
    };

    input.addEventListener('input', apply);
    box.hidden = false;
    apply();
}

/* ===== Тест ===== */
const QUIZ_ANSWERS = { q1: 'b', q2: 'a', q3: 'c', q4: 'a', q5: 'b', q6: 'c' };

function initQuiz() {
    const form = document.querySelector('#quiz-form');
    if (!form) return;
    const result = document.querySelector('#quiz-result');
    const best = document.querySelector('#quiz-best');
    const total = Object.keys(QUIZ_ANSWERS).length;

    const showBest = () => {
        const score = loadData('quizBest', null);
        best.textContent = score === null
            ? 'Вы ещё не проходили тест.'
            : `Ваш лучший результат: ${score} из ${total}.`;
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        let score = 0;
        for (const [name, correct] of Object.entries(QUIZ_ANSWERS)) {
            const question = form.querySelector(`[data-question="${name}"]`);
            const isCorrect = form.elements[name].value === correct;
            question.classList.toggle('correct', isCorrect);
            question.classList.toggle('wrong', !isCorrect);
            if (isCorrect) score++;
        }

        let comment = 'Стоит перечитать разделы «Языки» и «Термины».';
        if (score === total) comment = 'Отлично, все ответы верные!';
        else if (score >= total / 2) comment = 'Хороший результат!';

        result.textContent = `Правильных ответов: ${score} из ${total}. ${comment}`;
        result.hidden = false;
        saveData('quizBest', Math.max(score, loadData('quizBest', 0)));
        showBest();
        result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    form.addEventListener('reset', () => {
        form.querySelectorAll('.quiz-question').forEach((q) => q.classList.remove('correct', 'wrong'));
        result.hidden = true;
    });

    showBest();
}

/* ===== Форма обратной связи ===== */
function formatPhone(value) {
    let digits = value.replace(/\D/g, '');
    if (digits === '') return '';
    if (digits[0] === '8') digits = '7' + digits.slice(1);
    if (digits[0] !== '7') digits = '7' + digits;
    const rest = digits.slice(1, 11);

    let result = '+7';
    if (rest.length > 0) result += ' (' + rest.slice(0, 3);
    if (rest.length > 3) result += ') ' + rest.slice(3, 6);
    if (rest.length > 6) result += '-' + rest.slice(6, 8);
    if (rest.length > 8) result += '-' + rest.slice(8, 10);
    return result;
}

function getErrorMessage(field) {
    const v = field.validity;
    if (v.valueMissing) return field.type === 'checkbox' ? 'Необходимо ваше согласие' : 'Заполните это поле';
    if (v.typeMismatch) return 'Введите корректный адрес, например name@example.com';
    if (v.patternMismatch) return field.title;
    if (v.tooShort) return `Минимум ${field.minLength} символов (сейчас ${field.value.length})`;
    if (v.rangeUnderflow || v.rangeOverflow) return 'Выберите дату в 2026 году';
    return field.validationMessage;
}

function showFieldError(field) {
    const container = field.closest('p') || field.parentElement;
    let error = container.querySelector('.field-error');
    if (field.validity.valid) {
        field.classList.remove('invalid');
        field.removeAttribute('aria-invalid');
        if (error) error.remove();
        return true;
    }
    if (!error) {
        error = document.createElement('span');
        error.className = 'field-error';
        error.id = field.id ? field.id + '-error' : '';
        container.append(error);
    }
    error.textContent = getErrorMessage(field);
    field.classList.add('invalid');
    field.setAttribute('aria-invalid', 'true');
    if (error.id) field.setAttribute('aria-describedby', error.id);
    return false;
}

function initFeedbackForm() {
    const form = document.querySelector('.feedback-form');
    if (!form) return;
    const success = document.querySelector('.form-success');
    const phone = form.querySelector('#user-phone');
    const message = form.querySelector('#user-msg');
    const counter = form.querySelector('.char-counter');
    const fields = [...form.querySelectorAll('input, select, textarea')]
        .filter((f) => f.type !== 'submit' && f.type !== 'reset');
    // Пароль и файл в черновик не сохраняем
    const draftFields = ['user-name', 'user-phone', 'user-email', 'fav-lang', 'meet-time', 'user-msg'];

    form.noValidate = true;

    const updateCounter = () => {
        counter.textContent = `${message.value.length} / ${message.maxLength}`;
    };

    const saveDraft = () => {
        const draft = {};
        draftFields.forEach((id) => { draft[id] = form.querySelector('#' + id).value; });
        saveData('feedbackDraft', draft);
    };

    const draft = loadData('feedbackDraft', {});
    draftFields.forEach((id) => {
        if (draft[id]) form.querySelector('#' + id).value = draft[id];
    });
    updateCounter();

    phone.addEventListener('input', () => { phone.value = formatPhone(phone.value); });
    message.addEventListener('input', updateCounter);
    form.addEventListener('input', saveDraft);

    // Ошибку показываем после ухода из поля, а затем обновляем при вводе
    fields.forEach((field) => {
        field.addEventListener('blur', () => showFieldError(field));
        field.addEventListener('input', () => {
            if (field.classList.contains('invalid')) showFieldError(field);
        });
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const invalid = fields.filter((field) => !showFieldError(field));
        if (invalid.length > 0) {
            invalid[0].focus();
            return;
        }
        const name = form.querySelector('#user-name').value.trim();
        success.textContent = `Спасибо, ${name}! Ваше сообщение принято, мы свяжемся с вами в выбранное время.`;
        success.hidden = false;
        form.reset();
    });

    form.addEventListener('reset', () => {
        try { localStorage.removeItem('feedbackDraft'); } catch { /* недоступно */ }
        form.querySelectorAll('.field-error').forEach((e) => e.remove());
        fields.forEach((f) => { f.classList.remove('invalid'); f.removeAttribute('aria-invalid'); });
        // Событие reset срабатывает до очистки полей, поэтому счётчик обновляем позже
        setTimeout(updateCounter);
    });
}

function initPractice9() {
    const like = document.getElementById('like-btn');
    if (like) initLike(like);
    const reg = document.getElementById('ask-register');
    if (!reg) return;
    reg.addEventListener('click', () => {
        if (prompt('Желаете пройти регистрацию на сайте?') === 'Да') {
            alert('Круто!');
        } else {
            alert('Попробуй ещё раз');
        }
    });

    document.getElementById('ask-login').addEventListener('click', () => {
        const login = prompt('Логин:');
        if (login === 'Админ') {
            const pass = prompt('Пароль:');
            if (pass === 'Я главный') {
                alert('Здравствуйте!');
            } else if (pass === '' || pass === null) {
                alert('Отменено');
            } else {
                alert('Неверный пароль');
            }
        } else if (login === '' || login === null) {
            alert('Отменено');
        } else {
            alert('Я вас не знаю');
        }
    });
}

function initLike(like) {
    let drawing = false;
    const draw = (e) => {
        const dot = document.createElement('div');
        dot.className = 'draw-dot';
        dot.style.left = e.pageX + 'px';
        dot.style.top = e.pageY + 'px';
        document.body.append(dot);
    };
    like.addEventListener('click', () => {
        like.classList.toggle('liked');
        drawing = !drawing;
        if (drawing) document.addEventListener('mousemove', draw);
        else document.removeEventListener('mousemove', draw);
    });
}

function isEmpty(obj) {
    for (const key in obj) return false;
    return true;
}

function Accumulator(startingValue) {
    this.value = startingValue;
    this.read = function () {
        const n = Number(prompt('Сколько ты хочешь добавить?', 1));
        if (!Number.isNaN(n)) this.value += n;
    };
}

function truncate(str, maxlength) {
    return str.length > maxlength ? str.slice(0, maxlength - 1) + '…' : str;
}

function initPractice10() {
    document.querySelectorAll('.card-body p').forEach((p) => {
        p.textContent = truncate(p.textContent, 50);
    });

    const clickButton = document.getElementById('click-btn');
    if (clickButton) {
        const cart = new Accumulator(0);
        const cartValue = document.getElementById('click-value');
        clickButton.addEventListener('click', () => {
            cart.read();
            cartValue.textContent = cart.value;
        });
    }

    const form = document.getElementById('login-form');
    if (!form) return;
    const text = document.getElementById('captcha-text');
    const input = document.getElementById('captcha-input');
    const msg = document.getElementById('captcha-msg');
    const submit = document.getElementById('login-submit');
    let answer = '';
    let numeric = false;

    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) code += letters[Math.floor(Math.random() * letters.length)];
    answer = code;
    text.textContent = code;

    const numberCaptcha = () => {
        const n = Math.floor(Math.random() * 10);
        const m = Math.floor(Math.random() * 10);
        answer = String(n + m);
        text.textContent = `${n} + ${m} = ?`;
        numeric = true;
    };

    document.getElementById('captcha-check').addEventListener('click', () => {
        const data = {};
        if (input.value.trim()) data.value = input.value.trim();
        if (isEmpty(data)) {
            msg.textContent = 'Поле не должно быть пустым';
            msg.className = 'captcha-msg error';
            return;
        }
        if (data.value === answer) {
            msg.textContent = 'Верно! Можно входить';
            msg.className = 'captcha-msg ok';
            submit.disabled = false;
        } else {
            msg.textContent = numeric ? 'Ошибка, попробуйте ещё раз' : 'Неверно, решите пример';
            msg.className = 'captcha-msg error';
            submit.disabled = true;
            numberCaptcha();
        }
        input.value = '';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Вход выполнен');
    });
}

/* ===== Курсы: каталог и корзина ===== */
const COURSES = [
    { id: 'python', title: 'Python с нуля', logo: 'python', price: 4900 },
    { id: 'js', title: 'JavaScript для веба', logo: 'js', price: 5900 },
    { id: 'java', title: 'Java: основы ООП', logo: 'java', price: 7500 },
    { id: 'cpp', title: 'C++ для игр', logo: 'cpp', price: 8900 },
    { id: 'csharp', title: 'C# и Unity', logo: 'csharp', price: 6900 },
    { id: 'c', title: 'Язык C и память', logo: 'c', price: 3900 },
];

function filterRange(arr, a, b) {
    return arr.filter((item) => item.price >= a && item.price <= b);
}

function formatPrice(price) {
    return price.toLocaleString('ru-RU');
}

function initStore() {
    const courseList = document.getElementById('course-list');
    if (!courseList) return;
    const cartList = document.getElementById('cart-list');
    const cartEmpty = document.getElementById('cart-empty');
    const cartTotal = document.getElementById('cart-total');
    const count = document.getElementById('course-count');
    const minInput = document.getElementById('price-min');
    const maxInput = document.getElementById('price-max');
    const sortButtons = document.querySelectorAll('[data-sort]');
    const cart = loadData('cart', []);
    let sort = null;

    const findCourse = (id) => COURSES.find((course) => course.id === id);

    const renderCatalog = () => {
        const min = minInput.value === '' ? 0 : Number(minInput.value);
        const max = maxInput.value === '' ? Infinity : Number(maxInput.value);
        const courses = filterRange(COURSES, min, max);
        if (sort) courses.sort((a, b) => (sort === 'asc' ? a.price - b.price : b.price - a.price));

        courseList.replaceChildren(...courses.map(({ id, title, logo, price }) => {
            const li = document.createElement('li');
            li.className = 'course-card';
            li.innerHTML = `<img src="images/lang-logos/${logo}.svg" alt="" width="64" height="64">
                <h3></h3><p class="course-price">${formatPrice(price)} ₽</p>
                <button type="button" class="pill-btn">В корзину</button>`;
            li.querySelector('h3').textContent = title;
            li.querySelector('button').addEventListener('click', () => addToCart(id));
            return li;
        }));
        count.textContent = courses.length > 0 ? `Найдено курсов: ${courses.length}` : 'Ничего не найдено';
    };

    const renderCart = () => {
        let total = 0;
        cartList.replaceChildren(...cart.map((item, index) => {
            const { title, price } = findCourse(item.id);
            total += price * item.qty;
            const li = document.createElement('li');
            li.className = 'cart-item';
            li.innerHTML = `<span class="cart-title"></span>
                <span class="cart-qty">
                    <button type="button" class="qty-btn" data-step="-1" aria-label="Меньше">−</button>
                    <span>${item.qty}</span>
                    <button type="button" class="qty-btn" data-step="1" aria-label="Больше">+</button>
                </span>
                <span class="cart-sum">${formatPrice(price * item.qty)} ₽</span>
                <button type="button" class="cart-remove" aria-label="Удалить">🗑</button>`;
            li.querySelector('.cart-title').textContent = title;
            li.querySelectorAll('.qty-btn').forEach((button) => {
                button.addEventListener('click', () => {
                    item.qty = Math.max(1, item.qty + Number(button.dataset.step));
                    update();
                });
            });
            li.querySelector('.cart-remove').addEventListener('click', () => {
                cart.splice(index, 1);
                update();
            });
            return li;
        }));
        cartTotal.textContent = formatPrice(total);
        cartEmpty.hidden = cart.length > 0;
    };

    const update = () => {
        saveData('cart', cart);
        renderCart();
    };

    const addToCart = (id) => {
        const item = cart.find((i) => i.id === id);
        if (item) item.qty++;
        else cart.push({ id, qty: 1 });
        update();
        showNotification({ html: `Курс «${findCourse(id).title}» добавлен в корзину` });
    };

    document.getElementById('cart-clear').addEventListener('click', () => {
        cart.length = 0;
        update();
        showNotification({ html: 'Корзина очищена', className: 'notification-warn' });
    });

    sortButtons.forEach((button) => {
        button.addEventListener('click', () => {
            sort = button.dataset.sort;
            sortButtons.forEach((b) => b.setAttribute('aria-pressed', b === button));
            renderCatalog();
        });
    });
    minInput.addEventListener('input', renderCatalog);
    maxInput.addEventListener('input', renderCatalog);

    renderCatalog();
    renderCart();
}

function initPlanList() {
    const button = document.getElementById('plan-btn');
    if (!button) return;
    const list = document.getElementById('plan-list');
    button.addEventListener('click', () => {
        let text = prompt('Что хотите изучить?');
        while (text) {
            const li = document.createElement('li');
            li.textContent = text;
            list.append(li);
            text = prompt('Что ещё хотите изучить?');
        }
    });
}

/* ===== Запуск ===== */
document.addEventListener('DOMContentLoaded', () => {
    initToTop();
    initBurger();
    initNotifications();
    initYear();
    initNews();
    initLanguageFilter();
    initTabs();
    initCopyButtons();
    initTermSearch();
    initQuiz();
    initFeedbackForm();
    initPractice9();
    initPractice10();
    initStore();
    initPlanList();
});
