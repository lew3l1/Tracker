(() => {
  'use strict';

  const KEYS = { habits: 'forma.habits.v1', logs: 'forma.logs.v1', journal: 'forma.journal.v1', language: 'forma.language.v1', reminders: 'forma.reminders.v1', theme: 'forma.theme.v1', auth: 'forma.auth.session.v1', owner: 'forma.data.owner.v1' };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const categories = ['Здоровье', 'Развитие', 'Фокус', 'Осознанность'];
  const categoryClass = { 'Здоровье': 'health', 'Развитие': 'growth', 'Фокус': 'focus', 'Осознанность': 'mind' };
  const moodLabels = { low: 'Тяжело', okay: 'Нормально', good: 'Хорошо', great: 'Отлично' };
  const quotes = [
    'Мы становимся тем, что делаем регулярно.',
    'Не нужно видеть всю лестницу. Достаточно сделать следующий шаг.',
    'Маленький прогресс — тоже прогресс.',
    'Дисциплина — это забота о себе в будущем.',
    'Не сравнивай свой первый шаг с чьей-то серединой пути.'
  ];
  const seedHabits = [
    { id: 'seed-water', name: 'Выпить достаточно воды', description: 'Забота о теле начинается с простого', category: 'Здоровье', emoji: '💧', createdAt: todayKey() },
    { id: 'seed-move', name: 'Двигаться 20 минут', description: 'Прогулка, тренировка или растяжка', category: 'Здоровье', emoji: '🏃', createdAt: todayKey() },
    { id: 'seed-read', name: 'Читать 10 страниц', description: 'Понемногу каждый день', category: 'Развитие', emoji: '📚', createdAt: todayKey() },
    { id: 'seed-learn', name: 'Изучить что-то новое', description: 'Язык, код или новый навык', category: 'Развитие', emoji: '🧠', createdAt: todayKey() },
    { id: 'seed-focus', name: '25 минут без отвлечений', description: 'Один фокус — одна задача', category: 'Фокус', emoji: '🎯', createdAt: todayKey() },
    { id: 'seed-journal', name: 'Подвести итоги дня', description: 'Замечать маленькие победы', category: 'Осознанность', emoji: '✍️', createdAt: todayKey() }
  ];

  function todayKey() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  function parseDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  function keyOf(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function addDays(key, amount) {
    const date = parseDate(key);
    date.setDate(date.getDate() + amount);
    return keyOf(date);
  }
  function range(end, count) {
    return Array.from({ length: count }, (_, i) => addDays(end, i - count + 1));
  }
  function localeForLanguage() { return language === 'en' ? 'en-US' : 'ru-RU'; }
  function fmt(key, options = { day: 'numeric', month: 'short' }) {
    return parseDate(key).toLocaleDateString(localeForLanguage(), options).replace(' г.', '');
  }
  function formatHeaderDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString(localeForLanguage(), { day: 'numeric', month: language === 'en' ? 'short' : 'long' });
    const time = now.toLocaleTimeString(localeForLanguage(), { hour: 'numeric', minute: '2-digit', hour12: language === 'en' });
    return date + ' · ' + time;
  }
  function formatReminderTime(value) {
    const normalized = parseReminderTime(value);
    if (!normalized) return language === 'en' ? '9:00 AM' : '09:00';
    if (language !== 'en') return normalized;
    const [hourValue, minuteValue] = normalized.split(':').map(Number);
    const suffix = hourValue >= 12 ? 'PM' : 'AM';
    const hour12 = hourValue % 12 || 12;
    return hour12 + ':' + String(minuteValue).padStart(2, '0') + ' ' + suffix;
  }
  function parseReminderTime(value) {
    const input = String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
    let match = input.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (match) return String(Number(match[1])).padStart(2, '0') + ':' + match[2];
    match = input.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/);
    if (!match) return null;
    let hour = Number(match[1]) % 12;
    if (match[3] === 'PM') hour += 12;
    return String(hour).padStart(2, '0') + ':' + match[2];
  }

  const TRANSLATIONS = window.FORMA_I18N || {};
  const TRANSLATIONS_REVERSE = Object.fromEntries(Object.entries(TRANSLATIONS).map(([ru, en]) => [en, ru]));
  function translateValue(value) {
    const raw = String(value ?? '');
    const lead = (raw.match(/^\s*/) || [''])[0];
    const trail = (raw.match(/\s*$/) || [''])[0];
    const core = raw.slice(lead.length, raw.length - trail.length);
    if (!core) return raw;
    const lookup = language === 'en' ? TRANSLATIONS : TRANSLATIONS_REVERSE;
    if (Object.prototype.hasOwnProperty.call(lookup, core)) return lead + lookup[core] + trail;
    let match;
    if (language === 'en') {
      match = core.match(/^(\d+) выполнено$/); if (match) return lead + match[1] + ' completed' + trail;
      match = core.match(/^(\d+) осталось$/); if (match) return lead + match[1] + ' remaining' + trail;
      match = core.match(/^(\d+) дней?$/); if (match) return lead + match[1] + (match[1] === '1' ? ' day' : ' days') + trail;
      match = core.match(/^(\d+) дн\.$/); if (match) return lead + match[1] + (match[1] === '1' ? ' day' : ' days') + trail;
      match = core.match(/^(\d+) привычек$/); if (match) return lead + match[1] + ' habits' + trail;
      match = core.match(/^(\d+)% · (\d+) привычек$/); if (match) return lead + match[1] + '% · ' + match[2] + ' habits' + trail;
      match = core.match(/^(\d+) выполнено сегодня ✓$/); if (match) return lead + match[1] + ' completed today ✓' + trail;
      match = core.match(/^Ежедневные отметки привычек за (\d+) дней?$/); if (match) return lead + 'Daily habit check-ins over ' + match[1] + (match[1] === '1' ? ' day' : ' days') + trail;
      const hintSuffix = ' · Уже выполнено сегодня — отличная работа.';
      if (core.endsWith(hintSuffix)) return lead + translateValue(core.slice(0, -hintSuffix.length)) + ' · Already completed today — great work.' + trail;
      for (const [ru, en] of Object.entries(TRANSLATIONS)) {
        if ((ru.endsWith(':') || ru.endsWith('(') || (ru.endsWith('«') && ru !== 'Удалить привычку «')) && core.startsWith(ru)) return lead + en + translateValue(core.slice(ru.length)) + trail;
      }
    } else {
      match = core.match(/^(\d+) completed$/); if (match) return lead + match[1] + ' выполнено' + trail;
      match = core.match(/^(\d+) remaining$/); if (match) return lead + match[1] + ' осталось' + trail;
      match = core.match(/^(\d+) days?$/); if (match) return lead + match[1] + ' дней' + trail;
      match = core.match(/^(\d+) habits$/); if (match) return lead + match[1] + ' привычек' + trail;
      match = core.match(/^(\d+)% · (\d+) habits$/); if (match) return lead + match[1] + '% · ' + match[2] + ' привычек' + trail;
      match = core.match(/^(\d+) completed today ✓$/); if (match) return lead + match[1] + ' выполнено сегодня ✓' + trail;
      match = core.match(/^Daily habit check-ins over (\d+) days?$/); if (match) return lead + 'Ежедневные отметки привычек за ' + match[1] + ' дней' + trail;
      const englishHintSuffix = ' · Already completed today — great work.';
      if (core.endsWith(englishHintSuffix)) return lead + translateValue(core.slice(0, -englishHintSuffix.length)) + ' · Уже выполнено сегодня — отличная работа.' + trail;
      for (const [en, ru] of Object.entries(TRANSLATIONS_REVERSE)) {
        if ((en.endsWith(':') || en.endsWith('(') || (en.endsWith('“') && en !== 'Delete the habit “')) && core.startsWith(en)) return lead + ru + translateValue(core.slice(en.length)) + trail;
      }
      const removeConfirm = core.match(/^Delete the habit “(.+)”\? Its check-in history will also be deleted\.$/);
      if (removeConfirm) return lead + 'Удалить привычку «' + removeConfirm[1] + '»? История её отметок тоже будет удалена.' + trail;
    }
    if (language === 'en') {
      const removeConfirm = core.match(/^Удалить привычку «(.+)»\? История её отметок тоже будет удалена\.$/);
      if (removeConfirm) return lead + 'Delete the habit “' + removeConfirm[1] + '”? Its check-in history will also be deleted.' + trail;
    }
    const separator = ' · ';
    const pieces = core.split(separator);
    if (pieces.length === 2) {
      const left = translateValue(pieces[0]);
      const right = translateValue(pieces[1]);
      if (left !== pieces[0] || right !== pieces[1]) return lead + left + separator + right + trail;
    }
    return raw;
  }
  function applyLanguage() {
    document.documentElement.lang = language === 'en' ? 'en' : 'ru';
    const langButton = $('#language-toggle');
    if (langButton) {
      langButton.textContent = language.toUpperCase();
      langButton.title = language === 'en' ? 'Switch to Russian' : 'Переключить на английский';
      langButton.setAttribute('aria-label', langButton.title);
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,textarea,#account-profile-name,#account-profile-email,.assistant-message:not(#assistant-welcome),.community-person-identity')) continue;
      const translated = translateValue(node.nodeValue);
      if (translated !== node.nodeValue) node.nodeValue = translated;
    }
    document.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach(element => {
      for (const attr of ['title', 'aria-label', 'placeholder', 'alt']) {
        const value = element.getAttribute(attr);
        if (value !== null) element.setAttribute(attr, translateValue(value));
      }
    });
    document.title = 'Forma — Habit Tracker';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = language === 'en' ? 'Forma — a personal habit tracker, goal planner, and daily reflection journal.' : 'Forma — персональный трекер привычек, целей и ежедневной рефлексии.';
    const dateNode = $('#top-date');
    if (dateNode) dateNode.textContent = formatHeaderDateTime();
  }
  function setLanguage(nextLanguage) {
    language = nextLanguage === 'en' ? 'en' : 'ru';
    write(KEYS.language, language);
    renderAll();
  }
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('Не удалось прочитать локальные данные:', error);
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if ([KEYS.habits, KEYS.logs, KEYS.journal, KEYS.reminders, KEYS.language].includes(key)) scheduleCloudSync();
      return true;
    } catch (error) {
      console.error('Не удалось сохранить данные:', error);
      toast('Не удалось сохранить данные. Проверь свободное место в браузере.');
      return false;
    }
  }
  function uid() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'h-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  let session = read(KEYS.auth, null);
  let dataOwner = read(KEYS.owner, null) || (session && session.user && session.user.id) || 'guest';
  let hydratingCloud = true;
  let cloudTimer = 0;
  let cloudSyncInFlight = false;
  let cloudSyncStatus = session && session.user ? 'checking' : 'local';
  let accountMode = 'login';
  let assistantBusy = false;
  let assistantHistory = [];

  let communityProfile = null;
  let communityFriends = [];
  let communityIncoming = [];
  let communityOutgoing = [];
  let communitySearchResults = [];
  let communitySearchQuery = '';
  let communityLoading = false;
  let communitySearchLoading = false;
  let communityActionBusy = false;
  let communityError = '';
  let communityProfileMessage = '';
  let communityProfileMessageType = '';
  let communitySearchError = '';

  let habits = read(KEYS.habits, null);
  if (!Array.isArray(habits)) {
    habits = seedHabits;
    write(KEYS.habits, habits);
  }
  let logs = read(KEYS.logs, {});
  let journal = read(KEYS.journal, {});
  let language = read(KEYS.language, 'ru') === 'en' ? 'en' : 'ru';
  let reminders = read(KEYS.reminders, {});
  if (!reminders || typeof reminders !== 'object' || Array.isArray(reminders)) reminders = {};
  let focusMode = 'focus';
  let focusDuration = 25 * 60;
  let focusRemaining = 25 * 60;
  let focusRunning = false;
  let focusEndAt = 0;
  let focusInterval = 0;
  let focusHabitId = '';
  let focusStatusMessage = 'Таймер готов к запуску.';
  const focusDurations = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
  let selectedDate = todayKey();
  let activeView = 'today';
  let activeFilter = 'Все';
  let insightRange = 7;
  let toastTimer = 0;

  function isDone(habitId, day = selectedDate) {
    return Boolean(logs[day] && logs[day][habitId]);
  }
  function doneCount(day = selectedDate) {
    return habits.filter(h => isDone(h.id, day)).length;
  }
  function rate(day) {
    if (!habits.length) return 0;
    return Math.round(doneCount(day) / habits.length * 100);
  }
  function streakFor(habitId, from = selectedDate) {
    let count = 0;
    let day = from;
    while (logs[day] && logs[day][habitId]) {
      count += 1;
      day = addDays(day, -1);
      if (count > 4000) break;
    }
    return count;
  }
  function bestStreakFor(habitId, days = 365) {
    let best = 0, current = 0;
    for (const day of range(selectedDate, days).reverse()) {
      if (isDone(habitId, day)) {
        current += 1;
        best = Math.max(best, current);
      } else current = 0;
    }
    return best;
  }
  function overallStreak() {
    let count = 0, day = selectedDate;
    while (habits.length && rate(day) === 100) {
      count += 1;
      day = addDays(day, -1);
      if (count > 4000) break;
    }
    return count;
  }
  function currentBestStreak() {
    return habits.reduce((best, habit) => Math.max(best, bestStreakFor(habit.id, 365)), 0);
  }
  function avgRate(days) {
    const dates = range(selectedDate, days);
    if (!habits.length) return 0;
    return Math.round(dates.reduce((sum, day) => sum + rate(day), 0) / dates.length);
  }
  function saveLogs() { write(KEYS.logs, logs); }
  function navigate(view) {
    if (!['today', 'habits', 'table', 'insights', 'journal', 'focus', 'friends'].includes(view)) return;
    activeView = view;
    $('.view').forEach(section => {
      const active = section.id === 'view-' + view;
      section.hidden = !active;
      section.classList.toggle('active', active);
    });
    $('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    $('#crumb').textContent = ({ today: 'Мой день', habits: 'Привычки', table: 'Таблица', insights: 'Моя динамика', journal: 'Дневник', focus: 'Фокус и напоминания', friends: 'Друзья' })[view];
    renderAll();
    if (view === 'friends') loadCommunity();
  }
  function setHabitState(id, day, done) {
    logs[day] ||= {};
    if (done) logs[day][id] = true;
    else delete logs[day][id];
    if (!Object.keys(logs[day]).length) delete logs[day];
    saveLogs();
    renderAll();
  }
  function toggleHabit(id) {
    setHabitState(id, selectedDate, !isDone(id, selectedDate));
  }
  function renderHeader() {
    $('#top-date').textContent = formatHeaderDateTime();
    $('#today-eyebrow').textContent = fmt(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' }).toLocaleUpperCase(localeForLanguage());
    $('#hero-date').textContent = fmt(selectedDate);
    $('#prev-day').disabled = selectedDate <= '2000-01-01';
    $('#next-day').disabled = selectedDate >= todayKey();
  }
  function renderToday() {
    const completed = doneCount();
    const total = habits.length;
    const percent = rate(selectedDate);
    $('#ring-percent').textContent = percent + '%';
    $('#today-ring').style.setProperty('--progress', percent * 3.6 + 'deg');
    $('#today-ring').setAttribute('aria-label', 'Выполнено ' + percent + ' процентов');
    $('#main-progress').style.width = percent + '%';
    $('#side-progress').style.width = percent + '%';
    $('#side-percent').textContent = percent + '%';
    $('#nav-progress').textContent = completed + '/' + total;
    $('#done-count').textContent = completed + ' выполнено';
    $('#left-count').textContent = Math.max(total - completed, 0) + ' осталось';
    $('#daily-title').textContent = total === 0 ? 'Добавь первую привычку' : completed === total ? 'Ты сделал(а) всё на сегодня!' : completed ? 'Хорошее начало — продолжай' : 'Начни с одной привычки';
    $('#daily-copy').textContent = total === 0 ? 'Создай привычку, которая поддерживает твою цель.' : completed === total ? 'Все привычки отмечены. Позволь себе почувствовать это достижение.' : 'Даже одно небольшое действие — шаг в нужную сторону.';
    $('#streak-number').textContent = overallStreak();
    $('#week-rate').textContent = avgRate(7) + '%';
    $('#active-count').textContent = total;
    $('#week-average').textContent = avgRate(7) + '%';

    const dates = range(selectedDate, 7);
    const rates = dates.map(rate);
    const maxRate = Math.max(...rates, 0);
    const bestIndex = rates.indexOf(maxRate);
    $('#best-day').textContent = maxRate > 0 ? fmt(dates[bestIndex], { weekday: 'short', day: 'numeric' }) : 'Пока нет';
    $('#week-chart').innerHTML = dates.map((day, i) => {
      const pct = rate(day);
      return '<div class="bar-column ' + (day === selectedDate ? 'today' : '') + '" title="' + fmt(day, { weekday: 'long', day: 'numeric', month: 'long' }) + ': ' + pct + '%"><span class="bar-value">' + pct + '%</span><div class="bar-track"><div class="bar-fill" style="height:' + pct + '%"></div></div><span class="bar-day">' + fmt(day, { weekday: 'short' }).replace('.', '') + '</span></div>';
    }).join('');

    const filtered = habits.filter(h => activeFilter === 'Все' || h.category === activeFilter);
    $('#today-list').innerHTML = filtered.length ? filtered.map(habit => {
      const done = isDone(habit.id);
      return '<div class="habit-row ' + (done ? 'is-done' : '') + '"><span class="habit-emoji">' + escapeHtml(habit.emoji) + '</span><div class="habit-info"><strong>' + escapeHtml(habit.name) + '</strong><small>' + escapeHtml(habit.description || habit.category) + '</small></div><span class="habit-meta">♨ ' + streakFor(habit.id) + '</span><button class="check-btn ' + (done ? 'done' : '') + '" data-toggle="' + escapeHtml(habit.id) + '" aria-label="' + (done ? 'Снять отметку' : 'Отметить выполнение') + '" aria-pressed="' + done + '">' + (done ? '✓' : '') + '</button></div>';
    }).join('') : '<div class="empty-state"><strong>Здесь пока пусто</strong>Добавь привычку или выбери другую категорию.</div>';
    $('#quote-text').textContent = quotes[Math.abs(parseDate(selectedDate).getDate()) % quotes.length];
  }
  function renderHabits() {
    const completed = doneCount();
    $('#total-habits').textContent = habits.length;
    $('#today-total').textContent = completed + ' / ' + habits.length;
    $('#best-streak').textContent = currentBestStreak() + ' дней';
    const sort = $('#habit-sort').value;
    const ordered = [...habits].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'ru') : sort === 'streak' ? streakFor(b.id) - streakFor(a.id) : categories.indexOf(a.category) - categories.indexOf(b.category) || a.name.localeCompare(b.name, 'ru'));
    $('#all-habits-list').innerHTML = ordered.length ? ordered.map(h => '<div class="all-habit-row"><span class="habit-emoji">' + escapeHtml(h.emoji) + '</span><div class="habit-info"><strong>' + escapeHtml(h.name) + '</strong><small>' + escapeHtml(h.category) + (h.description ? ' · ' + escapeHtml(h.description) : '') + '</small></div><span class="habit-meta">♨ ' + streakFor(h.id) + ' дн.</span><div class="habit-actions"><button class="small-action" data-edit="' + escapeHtml(h.id) + '">Изменить</button><button class="small-action" data-delete="' + escapeHtml(h.id) + '">Удалить</button></div></div>').join('') : '<div class="empty-state"><strong>Начни с малого</strong>Нажми «Новая привычка», чтобы создать первый пункт.</div>';
  }

  function renderMatrix() {
    const daysCount = Number($('#matrix-range').value || 7);
    const days = range(todayKey(), daysCount);
    const completed = days.reduce((sum, day) => sum + doneCount(day), 0);
    const total = days.length * habits.length;
    $('#matrix-done').textContent = completed;
    $('#matrix-total').textContent = total;
    $('#matrix-rate').textContent = total ? Math.round(completed / total * 100) + '%' : '0%';
    const head = '<thead><tr><th scope="col">Привычка</th>' + days.map(day => '<th scope="col" class="' + (day === todayKey() ? 'matrix-today' : '') + '"><span class="matrix-day">' + fmt(day, { day: 'numeric', month: 'short' }) + '</span><span class="matrix-weekday">' + fmt(day, { weekday: 'short' }).replace('.', '') + '</span></th>').join('') + '</tr></thead>';
    const body = habits.length ? '<tbody>' + habits.map(habit => '<tr><th scope="row"><span class="matrix-habit-label"><span class="matrix-habit-emoji">' + escapeHtml(habit.emoji) + '</span><span class="matrix-habit-copy"><strong>' + escapeHtml(habit.name) + '</strong><small>' + escapeHtml(habit.category) + '</small></span></span></th>' + days.map(day => {
      const checked = isDone(habit.id, day);
      const future = day > todayKey();
      return '<td class="' + (day === todayKey() ? 'matrix-today' : '') + '"><input class="matrix-check" type="checkbox" data-matrix-toggle="' + escapeHtml(habit.id) + '" data-day="' + day + '" aria-label="' + escapeHtml(habit.name) + ', ' + fmt(day, { day: 'numeric', month: 'long', year: 'numeric' }) + '" ' + (checked ? 'checked' : '') + (future ? ' disabled title="День ещё не наступил"' : '') + '></td>';
    }).join('') + '</tr>').join('') + '</tbody>' : '<tbody><tr><td colspan="' + (days.length + 1) + '"><div class="empty-state"><strong>Пока нет привычек</strong>Создай первую привычку, и она появится в этой таблице.</div></td></tr></tbody>';
    $('#habit-matrix').innerHTML = '<caption class="sr-only">Ежедневные отметки привычек за ' + daysCount + ' дней</caption>' + head + body;
  }

  function renderInsights() {
    const days = range(selectedDate, insightRange);
    let totalSlots = days.length * habits.length;
    const doneSlots = days.reduce((sum, day) => sum + doneCount(day), 0);
    $('#insight-rate').textContent = totalSlots ? Math.round(doneSlots / totalSlots * 100) + '%' : '0%';
    $('#insight-done').textContent = doneSlots;
    $('#insight-streak').textContent = currentBestStreak();
    $('#activity-grid').innerHTML = range(selectedDate, 30).map(day => {
      const pct = rate(day);
      const level = pct === 0 ? 0 : pct < 25 ? 1 : pct < 50 ? 2 : pct < 80 ? 3 : 4;
      return '<div class="activity-cell level-' + level + '" title="' + fmt(day, { day: 'numeric', month: 'long' }) + ': ' + pct + '%"></div>';
    }).join('');
    $('#category-stats').innerHTML = categories.map(category => {
      const subset = habits.filter(h => h.category === category);
      const attempts = subset.length * days.length;
      const completed = days.reduce((sum, day) => sum + subset.filter(h => isDone(h.id, day)).length, 0);
      const pct = attempts ? Math.round(completed / attempts * 100) : 0;
      return '<div><div class="category-stat-head"><strong>' + category + '</strong><span>' + pct + '% · ' + subset.length + ' привычек</span></div><div class="category-track"><div class="category-fill ' + categoryClass[category] + '" style="width:' + pct + '%"></div></div></div>';
    }).join('');
    $('#insight-chart').innerHTML = days.map(day => {
      const pct = rate(day);
      return '<div class="insight-column" title="' + fmt(day, { day: 'numeric', month: 'short' }) + ': ' + pct + '%"><div class="insight-bar" style="height:' + Math.max(pct, 2) + 'px"></div><span>' + fmt(day, { day: 'numeric', month: 'short' }) + '</span></div>';
    }).join('');
  }
  function renderJournal() {
    const entry = journal[selectedDate] || {};
    $('#journal-date-label').textContent = fmt(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' });
    $('#journal-entry').value = entry.text || '';
    $$('#moods button').forEach(button => button.classList.toggle('active', button.dataset.mood === entry.mood));
    $('#journal-count').textContent = Object.values(journal).filter(item => item.text && item.text.trim()).length;
    $('#journal-done').textContent = doneCount();
    $('#save-state').textContent = '● Сохранено локально';
    $('#journal-prev').disabled = selectedDate <= '2000-01-01';
    $('#journal-next').disabled = selectedDate >= todayKey();
  }

  function formatFocusTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    return String(Math.floor(safe / 60)).padStart(2, '0') + ':' + String(safe % 60).padStart(2, '0');
  }
  function renderFocusTimer() {
    const face = $('#focus-timer-face');
    if (!face) return;
    $('#focus-timer-display').textContent = formatFocusTime(focusRemaining);
    face.style.setProperty('--timer-progress', Math.max(0, Math.min(100, focusRemaining / Math.max(focusDuration, 1) * 100)) + '%');
    face.setAttribute('aria-label', (language === 'en' ? 'Time remaining ' : 'Осталось ') + formatFocusTime(focusRemaining));
    $('#focus-timer-caption').textContent = translateValue(focusMode === 'focus' ? 'Пора сосредоточиться' : 'Время немного отдохнуть');
    $('#focus-toggle').textContent = translateValue(focusRunning ? 'Ⅱ Пауза' : (focusRemaining > 0 && focusRemaining < focusDuration ? '▶ Продолжить' : '▶ Начать фокус'));
    $('#focus-session-status').textContent = translateValue(focusRunning ? (focusMode === 'focus' ? 'Идёт сессия фокусировки. Не отвлекайся на лишнее.' : 'Идёт время отдыха. Перезарядись без спешки.') : focusStatusMessage);
    $$('[data-focus-mode]').forEach(button => button.classList.toggle('active', button.dataset.focusMode === focusMode));
  }
  function renderFocus() {
    const select = $('#focus-habit');
    if (!select) return;
    const previous = select.value || focusHabitId;
    select.innerHTML = habits.length
      ? habits.map(habit => '<option value="' + escapeHtml(habit.id) + '">' + escapeHtml(habit.emoji + ' ' + habit.name) + '</option>').join('')
      : '<option value="">Сначала добавь привычку</option>';
    focusHabitId = habits.some(habit => habit.id === previous) ? previous : (habits[0] ? habits[0].id : '');
    select.value = focusHabitId;
    select.disabled = !habits.length;
    const selectedHabit = habits.find(habit => habit.id === focusHabitId);
    $('#focus-hint').textContent = selectedHabit
      ? (selectedHabit.description || selectedHabit.category) + (isDone(selectedHabit.id, todayKey()) ? ' · Уже выполнено сегодня — отличная работа.' : '')
      : 'Добавь привычку, чтобы связать фокус-сессию с конкретным действием.';
    const permissionAvailable = 'Notification' in window;
    const permission = permissionAvailable ? Notification.permission : 'unsupported';
    $('#enable-notifications').disabled = !permissionAvailable || permission === 'denied' || permission === 'granted';
    $('#enable-notifications').textContent = !permissionAvailable ? 'Недоступно' : permission === 'granted' ? 'Включено ✓' : permission === 'denied' ? 'Заблокировано' : 'Разрешить';
    $('#notification-title').textContent = !permissionAvailable ? 'Уведомления недоступны' : permission === 'granted' ? 'Уведомления разрешены' : permission === 'denied' ? 'Уведомления заблокированы' : 'Браузерные уведомления';
    $('#notification-description').textContent = !permissionAvailable
      ? 'Этот браузер не поддерживает системные уведомления. Напоминания будут доступны в интерфейсе Forma после включения разрешений в поддерживаемом браузере.'
      : permission === 'granted'
        ? 'Готово! Forma сможет показывать системные напоминания, пока страница открыта.'
        : permission === 'denied'
          ? 'Разрешение запрещено в настройках браузера. Нажми на значок настроек сайта рядом с адресом и разреши уведомления.'
          : 'Разреши системные уведомления, чтобы Forma могла напоминать о привычках.';
    $('#reminder-list').innerHTML = habits.length ? habits.map(habit => {
      const setting = reminders[habit.id] || {};
      const enabled = setting.enabled === true;
      const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(setting.time || '') ? setting.time : '09:00';
      const displayedTime = formatReminderTime(time);
      const timePlaceholder = language === 'en' ? '9:00 AM' : '09:00';
      const done = isDone(habit.id, todayKey());
      return '<div class="reminder-row ' + (enabled ? 'enabled' : '') + '"><span class="reminder-emoji">' + escapeHtml(habit.emoji) + '</span><div class="reminder-info"><strong>' + escapeHtml(habit.name) + '</strong><small>' + (done ? 'Выполнено сегодня ✓' : enabled ? 'Напомним сегодня, если ещё не отмечено' : escapeHtml(habit.category)) + '</small></div><input class="input reminder-time" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" lang="' + language + '" placeholder="' + timePlaceholder + '" value="' + displayedTime + '" data-reminder-time="' + escapeHtml(habit.id) + '" aria-label="' + (language === 'en' ? 'Reminder time for ' : 'Время напоминания для ') + escapeHtml(habit.name) + '"><input class="reminder-switch" type="checkbox" role="switch" data-reminder-toggle="' + escapeHtml(habit.id) + '" aria-label="Включить напоминание для ' + escapeHtml(habit.name) + '" ' + (enabled ? 'checked' : '') + '></div>';
    }).join('') : '<div class="empty-state"><strong>Пока нет привычек</strong>Создай привычку, и здесь можно будет настроить напоминание.</div>';
    renderFocusTimer();
    applyLanguage();
  }
  function setFocusMode(mode) {
    if (!Object.prototype.hasOwnProperty.call(focusDurations, mode)) return;
    if (focusInterval) clearInterval(focusInterval);
    focusInterval = 0;
    focusRunning = false;
    focusMode = mode;
    focusDuration = focusDurations[mode];
    focusRemaining = focusDuration;
    focusStatusMessage = mode === 'focus' ? 'Таймер готов к запуску.' : 'Отдых тоже часть прогресса.';
    renderFocusTimer();
  }
  function toggleFocusTimer() {
    if (focusRunning) {
      focusRemaining = Math.max(0, Math.ceil((focusEndAt - Date.now()) / 1000));
      focusRunning = false;
      if (focusInterval) clearInterval(focusInterval);
      focusInterval = 0;
      focusStatusMessage = 'Таймер на паузе. Продолжи, когда будешь готов.';
      renderFocusTimer();
      return;
    }
    if (focusRemaining <= 0) focusRemaining = focusDuration;
    focusEndAt = Date.now() + focusRemaining * 1000;
    focusRunning = true;
    focusStatusMessage = 'Сессия запущена.';
    if (focusInterval) clearInterval(focusInterval);
    focusInterval = setInterval(tickFocusTimer, 1000);
    renderFocusTimer();
  }
  function resetFocusTimer() {
    if (focusInterval) clearInterval(focusInterval);
    focusInterval = 0;
    focusRunning = false;
    focusRemaining = focusDuration;
    focusStatusMessage = 'Таймер сброшен и готов к запуску.';
    renderFocusTimer();
  }
  function tickFocusTimer() {
    if (!focusRunning) return;
    focusRemaining = Math.max(0, Math.ceil((focusEndAt - Date.now()) / 1000));
    if (focusRemaining <= 0) {
      focusRemaining = 0;
      focusRunning = false;
      if (focusInterval) clearInterval(focusInterval);
      focusInterval = 0;
      focusStatusMessage = focusMode === 'focus' ? 'Время вышло — отличная работа! Сделай короткую паузу.' : 'Пауза завершена. Возвращайся в своём темпе.';
      toast(focusStatusMessage);
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(translateValue('Forma · время вышло'), { body: translateValue(focusStatusMessage), icon: 'favicon.svg', tag: 'forma-focus-timer' });
        } catch (error) { console.warn('Не удалось показать уведомление таймера:', error); }
      }
    }
    renderFocusTimer();
  }
  async function enableBrowserNotifications() {
    if (!('Notification' in window)) {
      toast('Этот браузер не поддерживает уведомления.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      renderFocus();
      if (permission === 'granted') {
        toast('Уведомления включены');
        checkHabitReminders();
      } else if (permission === 'denied') {
        toast('Разреши уведомления в настройках браузера');
      } else {
        toast('Разрешение на уведомления не выдано');
      }
    } catch (error) {
      console.error('Не удалось запросить уведомления:', error);
      toast('Не удалось включить уведомления');
    }
  }
  async function setHabitReminder(habitId, enabled) {
    if (!reminders[habitId]) reminders[habitId] = { enabled: false, time: '09:00', lastNotifiedDate: '' };
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      if (Notification.permission === 'denied') {
        toast('Сначала разреши уведомления в настройках браузера');
        renderFocus();
        return;
      }
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast('Для напоминаний нужно разрешить системные уведомления');
          renderFocus();
          return;
        }
      } catch (error) {
        toast('Не удалось запросить разрешение на уведомления');
        renderFocus();
        return;
      }
    }
    if (enabled && !('Notification' in window)) {
      toast('Этот браузер не поддерживает уведомления');
      renderFocus();
      return;
    }
    reminders[habitId].enabled = enabled;
    write(KEYS.reminders, reminders);
    renderFocus();
    toast(enabled ? 'Напоминание включено' : 'Напоминание выключено');
    if (enabled) checkHabitReminders();
  }
  function saveHabitReminderTime(habitId, inputValue) {
    if (!reminders[habitId]) reminders[habitId] = { enabled: false, time: '09:00', lastNotifiedDate: '' };
    const normalizedTime = parseReminderTime(inputValue);
    const row = $('[data-reminder-time="' + CSS.escape(habitId) + '"]')?.closest('.reminder-row');
    const input = row && $('[data-reminder-time="' + CSS.escape(habitId) + '"]', row);
    if (!normalizedTime) {
      if (input) input.value = formatReminderTime(reminders[habitId].time || '09:00');
      toast(language === 'en' ? 'Enter a time like 9:00 AM or 13:00.' : 'Укажи время, например 09:00.');
      return;
    }
    if (reminders[habitId].time !== normalizedTime) reminders[habitId].lastNotifiedDate = '';
    reminders[habitId].time = normalizedTime;
    write(KEYS.reminders, reminders);
    if (input) input.value = formatReminderTime(normalizedTime);
    if (row) row.classList.toggle('enabled', reminders[habitId].enabled === true);
    toast('Время напоминания сохранено');
    checkHabitReminders();
  }
  function checkHabitReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const today = todayKey();
    let changed = false;
    habits.forEach(habit => {
      const setting = reminders[habit.id];
      if (!setting || setting.enabled !== true || isDone(habit.id, today) || setting.lastNotifiedDate === today) return;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(setting.time || '')) return;
      const parts = setting.time.split(':').map(Number);
      if (currentTime < parts[0] * 60 + parts[1]) return;
      setting.lastNotifiedDate = today;
      changed = true;
      try {
        const notification = new Notification(translateValue('Forma · время для привычки'), {
          body: language === 'en' ? habit.emoji + ' ' + habit.name + ' — take a few minutes for yourself.' : habit.emoji + ' ' + habit.name + ' — найди пару минут для себя.',
          icon: 'favicon.svg',
          tag: 'forma-reminder-' + habit.id
        });
        notification.onclick = () => {
          window.focus();
          navigate('today');
        };
      } catch (error) { console.warn('Не удалось показать напоминание:', error); }
    });
    if (changed) write(KEYS.reminders, reminders);
  }

  function renderAll() {
    renderHeader();
    renderToday();
    renderHabits();
    renderMatrix();
    renderInsights();
    renderJournal();
    renderFocus();
    renderAccountUI();
    renderCommunity();
    applyLanguage();
    $('#go-today').disabled = selectedDate === todayKey();
    $('#journal-today').disabled = selectedDate === todayKey();
    $$('[data-range]').forEach(button => button.classList.toggle('active', Number(button.dataset.range) === insightRange));
    $$('#today-filters [data-category]').forEach(button => button.classList.toggle('active', button.dataset.category === activeFilter));
  }

  function supabaseConfig() {
    const config = window.FORMA_CONFIG || {};
    return {
      url: String(config.supabaseUrl || '').replace(/\/$/, ''),
      key: String(config.supabaseAnonKey || ''),
      aiFunctionName: String(config.aiFunctionName || 'ai-assistant')
    };
  }
  function cloudConfigured() {
    const config = supabaseConfig();
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url) && config.key.length > 15;
  }
  function setAccountMessage(message, type = '') {
    const node = $('#account-message');
    node.textContent = translateValue(message);
    node.className = 'account-message' + (type ? ' ' + type : '');
  }
  function renderAvatar(img, fallback, url, initial) {
    fallback.textContent = initial || 'F';
    fallback.hidden = false;
    img.hidden = true;
    img.onerror = () => {
      img.hidden = true;
      fallback.hidden = false;
      img.removeAttribute('src');
    };
    img.onload = () => {
      img.hidden = false;
      fallback.hidden = true;
    };
    img.removeAttribute('src');
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return;
      img.src = parsed.href;
    } catch {
      // Keep the letter avatar if the provider photo URL is not valid.
    }
  }
  function renderAccountUI() {
    const user = session && session.user ? session.user : null;
    const email = user && user.email ? user.email : '';
    const metadata = user && user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
    const provider = user && user.app_metadata && user.app_metadata.provider
      ? String(user.app_metadata.provider)
      : user && Array.isArray(user.identities) && user.identities.some(identity => identity.provider === 'google') ? 'google' : 'email';
    const fullName = String(metadata.full_name || metadata.name || metadata.display_name || metadata.user_name || (email ? email.split('@')[0] : 'Гость'));
    const photo = String(metadata.avatar_url || metadata.picture || metadata.photo_url || '');
    const initial = (fullName.trim() || email || 'F').charAt(0).toLocaleUpperCase(localeForLanguage());

    $('#profile-title').textContent = email ? fullName : 'Гость';
    $('#profile-subtitle').textContent = email ? (cloudSyncStatus === 'synced' ? 'Синхронизировано' : cloudSyncStatus === 'error' ? 'Ошибка синхронизации' : cloudSyncStatus === 'checking' ? 'Проверяем облако…' : 'Аккаунт подключён') : 'Данные в браузере';
    renderAvatar($('#profile-avatar-img'), $('#profile-avatar-initial'), photo, initial);
    renderAvatar($('#account-button-avatar'), $('#account-button-fallback'), photo, initial);
    renderAvatar($('#account-avatar-img'), $('#account-avatar-initial'), photo, initial);

    $('#account-open').title = email ? 'Аккаунт: ' + fullName : 'Войти или создать аккаунт';
    $('#account-profile').hidden = !email;
    $('#account-profile-name').textContent = fullName;
    $('#account-profile-email').textContent = email;
    $('#account-profile-provider').textContent = provider === 'google' ? 'Google · Подключён' : provider === 'email' ? 'Email · Подключён' : provider + ' · Подключён';
    $('#account-profile-status').textContent = 'Авторизация активна';
    const syncNode = $('#account-sync-status');
    syncNode.classList.remove('sync-error', 'sync-ok', 'sync-pending');
    if (!email || !cloudConfigured()) {
      syncNode.textContent = 'Только в этом браузере';
    } else if (cloudSyncStatus === 'synced') {
      syncNode.textContent = 'Синхронизировано';
      syncNode.classList.add('sync-ok');
    } else if (cloudSyncStatus === 'error') {
      syncNode.textContent = 'Требуется проверка';
      syncNode.classList.add('sync-error');
    } else {
      syncNode.textContent = 'Проверяем подключение…';
      syncNode.classList.add('sync-pending');
    }
    const createdAt = user && user.created_at ? new Date(user.created_at) : null;
    $('#account-profile-created').textContent = createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString(localeForLanguage(), { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Не указана';

    $('#account-logout').hidden = !email;
    $('#account-form').hidden = Boolean(email);
    $('.account-tabs').hidden = Boolean(email);
    $('.oauth-divider').hidden = Boolean(email);
    $('#google-signin').hidden = Boolean(email);
    $('.google-note').hidden = Boolean(email);
    $('#account-submit').disabled = !cloudConfigured();
    $('#google-signin').disabled = !cloudConfigured();
    const note = $('#account-cloud-note');
    if (!cloudConfigured()) {
      note.textContent = 'Облачное хранилище ещё не настроено. Пока Forma хранит данные только в этом браузере.';
      setAccountMessage('Настрой Supabase, чтобы включить регистрацию и синхронизацию.', '');
    } else if (email) {
      note.textContent = cloudSyncStatus === 'synced'
        ? 'Аккаунт подключён. Привычки, отметки и дневник синхронизированы с облачным хранилищем.'
        : cloudSyncStatus === 'error'
          ? 'Google-вход выполнен, но облачные данные не удалось подтвердить. Проверь таблицу user_data и её RLS-политики.'
          : 'Аккаунт подключён. Проверяем доступ к личному облачному хранилищу.';
      setAccountMessage(cloudSyncStatus === 'synced' ? 'Аккаунт и облачное хранение работают.' : 'Google авторизация активна.', cloudSyncStatus === 'synced' ? 'success' : '');
    } else {
      note.textContent = 'Создай аккаунт, чтобы хранить привычки в облаке и открывать их на других устройствах.';
      if ($('#account-message').textContent.startsWith('Настрой Supabase')) setAccountMessage('', '');
    }
    $$('#account-form input').forEach(input => { input.disabled = !cloudConfigured(); });
    $('#account-submit').textContent = accountMode === 'login' ? 'Войти' : 'Создать аккаунт';
    $('#account-password').autocomplete = accountMode === 'login' ? 'current-password' : 'new-password';
    $$('#account-dialog [data-account-mode]').forEach(button => button.classList.toggle('active', button.dataset.accountMode === accountMode));
    applyLanguage();
  }  function setAccountMode(mode) {
    accountMode = mode === 'signup' ? 'signup' : 'login';
    setAccountMessage('', '');
    renderAccountUI();
  }
  async function supabaseAuthRequest(path, payload, bearer = '') {
    if (!cloudConfigured()) throw new Error('Сначала настрой Supabase в файле supabase-config.js.');
    const config = supabaseConfig();
    const response = await fetch(config.url + '/auth/v1/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.key, Authorization: 'Bearer ' + (bearer || config.key) },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || 'Ошибка авторизации (' + response.status + ').');
    return data;
  }
  function keepSession(data) {
    if (!data || !data.access_token || !data.user) return false;
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type || 'bearer',
      expires_in: data.expires_in || 3600,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      user: data.user
    };
    localStorage.setItem(KEYS.auth, JSON.stringify(session));
    return true;
  }
  async function refreshAuthSession() {
    if (!session || !session.refresh_token) throw new Error('Сессия истекла. Войди в аккаунт заново.');
    const data = await supabaseAuthRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    if (!keepSession(data)) throw new Error('Не удалось обновить сессию. Войди в аккаунт заново.');
    return session;
  }
  async function ensureFreshSession() {
    if (!session || !session.access_token) throw new Error('Войди в свой аккаунт.');
    if (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000) + 45) await refreshAuthSession();
  }
  async function supabaseDataRequest(path, options = {}) {
    if (!cloudConfigured()) throw new Error('Supabase ещё не настроен.');
    await ensureFreshSession();
    const config = supabaseConfig();
    const makeRequest = () => fetch(config.url + '/rest/v1/' + path, {
      ...options,
      headers: { apikey: config.key, Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    let response = await makeRequest();
    if (response.status === 401 && session && session.refresh_token) {
      await refreshAuthSession();
      response = await makeRequest();
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404 || data.code === 'PGRST205') throw new Error('Объекты базы данных Forma ещё не созданы. Выполни SQL из supabase/migrations/ в Supabase SQL Editor.');
      throw new Error(data.message || data.details || data.hint || 'Ошибка базы данных (' + response.status + ').');
    }
    return data;
  }

  function communityText(value) { return escapeHtml(translateValue(value)); }
  function defaultCommunityUsername(userId) {
    return 'user_' + String(userId || '').replace(/[^a-f0-9]/gi, '').toLowerCase().slice(0, 8);
  }
  function communityDisplayName(user) {
    const metadata = user && user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
    const candidate = String(metadata.full_name || metadata.name || metadata.display_name || metadata.user_name || '').trim();
    return (candidate || 'Пользователь Forma').slice(0, 32);
  }
  function communityAvatarMarkup(person) {
    const name = String(person && (person.display_name || person.username) || 'F').trim();
    const initial = escapeHtml((name || 'F').slice(0, 1).toLocaleUpperCase(localeForLanguage()));
    let photo = '';
    try {
      const parsed = new URL(String(person && person.avatar_url || ''));
      if (parsed.protocol === 'https:') photo = parsed.href;
    } catch { /* Keep the generated avatar when no photo is configured. */ }
    return '<span class="community-avatar"><span>' + initial + '</span>' +
      (photo ? '<img src="' + escapeHtml(photo) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '</span>';
  }
  function communityPersonTop(person) {
    return '<div class="community-person-top">' + communityAvatarMarkup(person) +
      '<div class="community-person-identity"><strong>' + escapeHtml(person.display_name || person.username || 'Forma user') +
      '</strong><small>@' + escapeHtml(person.username || 'user') + '</small></div></div>';
  }
  function communityActionButton(action, label, attrs = '', variant = '') {
    return '<button type="button" class="community-action-btn' + (variant ? ' ' + variant : '') +
      '" data-community-action="' + escapeHtml(action) + '" ' + attrs +
      (communityActionBusy ? ' disabled' : '') + '>' + communityText(label) + '</button>';
  }
  function communityRequestCard(request, direction) {
    const person = request.profile || { username: 'user', display_name: 'Пользователь Forma' };
    const actions = direction === 'incoming'
      ? communityActionButton('accept', 'Принять', 'data-request-id="' + escapeHtml(request.id) + '"', 'primary') +
        communityActionButton('reject', 'Отклонить', 'data-request-id="' + escapeHtml(request.id) + '"', 'danger')
      : communityActionButton('cancel', 'Отменить заявку', 'data-request-id="' + escapeHtml(request.id) + '"');
    return '<article class="community-person">' + communityPersonTop(person) +
      '<div class="community-person-actions">' + actions + '</div></article>';
  }
  function communitySearchCard(person) {
    const id = escapeHtml(person.id);
    const incoming = communityIncoming.find(request => request.sender_id === person.id);
    const outgoing = communityOutgoing.find(request => request.recipient_id === person.id);
    const isFriend = communityFriends.some(friend => friend.friend_id === person.id);
    let button;
    if (isFriend) button = communityActionButton('noop', 'Уже в друзьях', 'disabled aria-disabled="true"');
    else if (incoming) button = communityActionButton('accept', 'Принять заявку', 'data-request-id="' + escapeHtml(incoming.id) + '"', 'primary');
    else if (outgoing) button = communityActionButton('noop', 'Заявка отправлена', 'disabled aria-disabled="true"');
    else button = communityActionButton('send', 'Добавить в друзья', 'data-user-id="' + id + '"', 'primary');
    return '<article class="community-person">' + communityPersonTop(person) +
      '<div class="community-person-actions">' + button + '</div></article>';
  }
  function communityFriendCard(friend) {
    const habitCount = Math.max(0, Number(friend.habit_count) || 0);
    const doneToday = Math.max(0, Number(friend.done_today) || 0);
    const todayPercent = habitCount ? Math.max(0, Math.min(100, Number(friend.progress_percent) || 0)) : 0;
    const weekPercent = Math.max(0, Math.min(100, Number(friend.weekly_percent) || 0));
    const updated = friend.updated_at ? new Date(friend.updated_at) : null;
    const updatedText = updated && !Number.isNaN(updated.getTime())
      ? (language === 'en' ? 'Updated: ' : 'Обновлено: ') + updated.toLocaleString(localeForLanguage(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : communityText('Последнее обновление не записано');
    const todayValue = habitCount ? doneToday + ' / ' + habitCount : '—';
    const weekValue = habitCount ? weekPercent + '%' : '—';
    return '<article class="community-friend-card">' +
      communityPersonTop(friend) +
      '<div class="community-progress-grid">' +
        '<div class="community-progress-metric"><span>' + communityText('Сегодня') + ' · ' + communityText('выполнено сегодня') + '</span><strong>' + escapeHtml(todayValue) + '</strong></div>' +
        '<div class="community-progress-metric"><span>' + communityText('За 7 дней') + ' · ' + communityText('Среднее выполнение') + '</span><strong>' + escapeHtml(weekValue) + '</strong></div>' +
      '</div>' +
      '<div class="community-progress-bar" role="progressbar" aria-label="' + communityText('Выполнение за сегодня') + '" aria-valuenow="' + todayPercent + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + todayPercent + '%"></span></div>' +
      '<small class="community-friend-updated">' + escapeHtml(updatedText) + '</small>' +
      '<div class="community-person-actions">' + communityActionButton('remove', 'Удалить из друзей', 'data-user-id="' + escapeHtml(friend.friend_id) + '"', 'danger') + '</div>' +
    '</article>';
  }
  function renderCommunity() {
    const authRequired = $('#community-auth-required');
    const content = $('#community-content');
    if (!authRequired || !content) return;
    const signedIn = Boolean(session && session.user && cloudConfigured());
    authRequired.hidden = signedIn;
    content.hidden = !signedIn;
    if (!signedIn) return;

    const status = $('#community-status');
    status.textContent = communityError ? translateValue(communityError) : communityLoading ? translateValue('Обновляем круг друзей…') : '';
    status.className = 'community-status' + (communityError ? ' error' : '');

    const usernameInput = $('#friend-username');
    const displayInput = $('#friend-display-name');
    if (communityProfile) {
      if (document.activeElement !== usernameInput) usernameInput.value = communityProfile.username || '';
      if (document.activeElement !== displayInput) displayInput.value = communityProfile.display_name || '';
    }
    $('#friend-profile-message').textContent = translateValue(communityProfileMessage);
    $('#friend-profile-message').className = 'community-form-message' + (communityProfileMessageType ? ' ' + communityProfileMessageType : '');
    $('#friend-profile-save').disabled = communityActionBusy;
    $('#friend-search-submit').disabled = communitySearchLoading || communityActionBusy;
    $('#friend-incoming-count').textContent = String(communityIncoming.length);
    $('#friend-outgoing-count').textContent = String(communityOutgoing.length);
    $('#friend-list-count').textContent = String(communityFriends.length);

    const searchResults = $('#friend-search-results');
    if (communitySearchLoading) searchResults.innerHTML = '<p class="community-empty">' + communityText('Ищем пользователей…') + '</p>';
    else if (communitySearchError) searchResults.innerHTML = '<p class="community-empty">' + escapeHtml(translateValue(communitySearchError)) + '</p>';
    else if (!communitySearchQuery) searchResults.innerHTML = '<p class="community-empty">' + communityText('Введи username, чтобы найти человека.') + '</p>';
    else if (!communitySearchResults.length) searchResults.innerHTML = '<p class="community-empty">' + communityText('Найди первого друга или проверь написание username.') + '</p>';
    else searchResults.innerHTML = communitySearchResults.map(communitySearchCard).join('');

    $('#friend-incoming-list').innerHTML = communityLoading
      ? '<p class="community-empty">' + communityText('Обновляем круг друзей…') + '</p>'
      : communityIncoming.length ? communityIncoming.map(request => communityRequestCard(request, 'incoming')).join('')
      : '<p class="community-empty">' + communityText('Заявок пока нет.') + '</p>';
    $('#friend-outgoing-list').innerHTML = communityLoading
      ? '<p class="community-empty">' + communityText('Обновляем круг друзей…') + '</p>'
      : communityOutgoing.length ? communityOutgoing.map(request => communityRequestCard(request, 'outgoing')).join('')
      : '<p class="community-empty">' + communityText('Отправленных заявок нет.') + '</p>';
    $('#friend-list').innerHTML = communityLoading
      ? '<p class="community-empty">' + communityText('Обновляем круг друзей…') + '</p>'
      : communityFriends.length ? '<div class="community-friend-grid">' + communityFriends.map(communityFriendCard).join('') + '</div>'
      : '<p class="community-empty">' + communityText('Добавь первого друга — и вы сможете поддерживать друг друга.') + '</p>';
    $('.community-avatar img').forEach(imageNode => {
      imageNode.addEventListener('error', () => imageNode.remove(), { once: true });
    });
  }
  async function ensureCommunityProfile() {
    const user = session && session.user;
    if (!user) throw new Error('Сначала войди в аккаунт, чтобы использовать друзей.');
    const selectPath = 'profiles?select=id,username,display_name,avatar_url&id=eq.' + encodeURIComponent(user.id) + '&limit=1';
    let rows = await supabaseDataRequest(selectPath, { method: 'GET' });
    if (!Array.isArray(rows) || !rows.length) {
      const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
      let avatar = String(metadata.avatar_url || metadata.picture || metadata.photo_url || '');
      try { const parsed = new URL(avatar); avatar = parsed.protocol === 'https:' ? parsed.href : ''; } catch { avatar = ''; }
      await supabaseDataRequest('profiles?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({
          id: user.id,
          username: defaultCommunityUsername(user.id),
          display_name: communityDisplayName(user),
          avatar_url: avatar || null
        })
      });
      rows = await supabaseDataRequest(selectPath, { method: 'GET' });
    }
    if (!Array.isArray(rows) || !rows.length) throw new Error('Публичный профиль не найден.');
    communityProfile = rows[0];
    return communityProfile;
  }
  async function loadCommunity() {
    if (!session || !session.user || !cloudConfigured() || communityLoading) {
      renderCommunity();
      return;
    }
    communityLoading = true;
    communityError = '';
    renderCommunity();
    const userId = session.user.id;
    try {
      await ensureCommunityProfile();
      const uidValue = encodeURIComponent(userId);
      const requestQuery = 'select=id,sender_id,recipient_id,created_at&order=created_at.desc&limit=100';
      const results = await Promise.all([
        supabaseDataRequest('rpc/friend_progress', {
          method: 'POST',
          body: JSON.stringify({ p_today: todayKey(), p_week_start: addDays(todayKey(), -6) })
        }),
        supabaseDataRequest('friend_requests?' + requestQuery + '&recipient_id=eq.' + uidValue, { method: 'GET' }),
        supabaseDataRequest('friend_requests?' + requestQuery + '&sender_id=eq.' + uidValue, { method: 'GET' })
      ]);
      communityFriends = Array.isArray(results[0]) ? results[0] : [];
      const incomingRows = Array.isArray(results[1]) ? results[1] : [];
      const outgoingRows = Array.isArray(results[2]) ? results[2] : [];
      const profileIds = [...new Set(incomingRows.map(row => row.sender_id).concat(outgoingRows.map(row => row.recipient_id)))];
      const profileMap = new Map();
      if (profileIds.length) {
        const profiles = await supabaseDataRequest(
          'profiles?select=id,username,display_name,avatar_url&id=in.(' + profileIds.map(encodeURIComponent).join(',') + ')',
          { method: 'GET' }
        );
        if (Array.isArray(profiles)) profiles.forEach(profile => profileMap.set(profile.id, profile));
      }
      communityIncoming = incomingRows.map(row => ({ ...row, profile: profileMap.get(row.sender_id) || { username: 'user', display_name: 'Пользователь Forma' } }));
      communityOutgoing = outgoingRows.map(row => ({ ...row, profile: profileMap.get(row.recipient_id) || { username: 'user', display_name: 'Пользователь Forma' } }));
      if (!session || !session.user || session.user.id !== userId) return;
    } catch (error) {
      communityError = error.message || 'Не удалось загрузить систему друзей.';
      console.error('Ошибка загрузки друзей Forma:', error);
    } finally {
      communityLoading = false;
      renderCommunity();
    }
  }
  async function saveCommunityProfile(event) {
    event.preventDefault();
    if (!session || !session.user) { $('#account-dialog').showModal(); return; }
    const username = String($('#friend-username').value || '').trim().replace(/^@+/, '').toLowerCase();
    const displayName = String($('#friend-display-name').value || '').trim();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      communityProfileMessage = 'Username должен содержать от 3 до 20 символов: a–z, 0–9 или _.';
      communityProfileMessageType = 'error';
      renderCommunity();
      return;
    }
    if (displayName.length < 2 || displayName.length > 32) {
      communityProfileMessage = 'Имя должно содержать от 2 до 32 символов.';
      communityProfileMessageType = 'error';
      renderCommunity();
      return;
    }
    communityActionBusy = true;
    communityProfileMessage = '';
    communityProfileMessageType = '';
    renderCommunity();
    try {
      await supabaseDataRequest('profiles?id=eq.' + encodeURIComponent(session.user.id), {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ username, display_name: displayName, updated_at: new Date().toISOString() })
      });
      await ensureCommunityProfile();
      communityProfileMessage = 'Профиль сохранён.';
      communityProfileMessageType = 'success';
      communitySearchError = '';
    } catch (error) {
      communityProfileMessage = /duplicate key|unique constraint|profiles_username|23505/i.test(error.message)
        ? 'Этот username уже занят.'
        : error.message || 'Не удалось сохранить профиль.';
      communityProfileMessageType = 'error';
      console.error('Ошибка сохранения профиля Forma:', error);
    } finally {
      communityActionBusy = false;
      renderCommunity();
    }
  }
  async function searchCommunity(event) {
    event.preventDefault();
    if (!session || !session.user) { $('#account-dialog').showModal(); return; }
    const query = String($('#friend-search').value || '').trim().replace(/^@+/, '').toLowerCase();
    communitySearchQuery = query;
    communitySearchResults = [];
    communitySearchError = '';
    if (!/^[a-z0-9_]{2,20}$/.test(query)) {
      communitySearchError = 'Введи не менее 2 символов username: латинские буквы, цифры или _.';
      renderCommunity();
      return;
    }
    communitySearchLoading = true;
    renderCommunity();
    try {
      const id = encodeURIComponent(session.user.id);
      const searchPath = 'profiles?select=id,username,display_name,avatar_url&username=ilike.*' + encodeURIComponent(query) + '*&id=neq.' + id + '&order=username.asc&limit=12';
      const rows = await supabaseDataRequest(searchPath, { method: 'GET' });
      communitySearchResults = Array.isArray(rows) ? rows : [];
    } catch (error) {
      communitySearchError = error.message || 'Не удалось найти пользователей.';
      console.error('Ошибка поиска друзей Forma:', error);
    } finally {
      communitySearchLoading = false;
      renderCommunity();
    }
  }
  async function handleCommunityAction(button) {
    if (communityActionBusy) return;
    const action = button.dataset.communityAction;
    if (action === 'noop') return;
    if (!session || !session.user) {
      renderAccountUI();
      $('#account-dialog').showModal();
      return;
    }
    const requestId = button.dataset.requestId;
    const targetId = button.dataset.userId;
    if (action === 'remove' && !window.confirm(translateValue('Удалить друга из своего списка?'))) return;
    communityActionBusy = true;
    communityError = '';
    renderCommunity();
    try {
      if (action === 'send') {
        if (!targetId || targetId === session.user.id) throw new Error('Нельзя добавить собственный аккаунт.');
        await supabaseDataRequest('friend_requests?on_conflict=sender_id,recipient_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify({ sender_id: session.user.id, recipient_id: targetId })
        });
        communityProfileMessage = 'Заявка отправлена.';
        communityProfileMessageType = 'success';
      } else if (action === 'accept') {
        if (!requestId) throw new Error('Заявка не найдена.');
        await supabaseDataRequest('rpc/accept_friend_request', {
          method: 'POST',
          body: JSON.stringify({ p_request_id: requestId })
        });
        communityProfileMessage = 'Заявка принята — вы теперь друзья.';
        communityProfileMessageType = 'success';
      } else if (action === 'reject' || action === 'cancel') {
        if (!requestId) throw new Error('Заявка не найдена.');
        await supabaseDataRequest('friend_requests?id=eq.' + encodeURIComponent(requestId), {
          method: 'DELETE',
          headers: { Prefer: 'return=minimal' }
        });
        communityProfileMessage = action === 'reject' ? 'Заявка отклонена.' : 'Заявка отменена.';
        communityProfileMessageType = 'success';
      } else if (action === 'remove') {
        if (!targetId) throw new Error('Пользователь не найден.');
        await supabaseDataRequest('rpc/remove_friend', {
          method: 'POST',
          body: JSON.stringify({ p_friend_id: targetId })
        });
        communityProfileMessage = 'Друг удалён из списка.';
        communityProfileMessageType = 'success';
      }
    } catch (error) {
      communityError = error.message || 'Не удалось выполнить действие.';
      console.error('Ошибка операции с друзьями Forma:', error);
    } finally {
      communityActionBusy = false;
      await loadCommunity();
      renderCommunity();
    }
  }

  function localSnapshot() {
    return { habits, logs, journal, reminders, language, theme: document.documentElement.dataset.theme || 'light' };
  }
  function setDataOwner(owner) {
    dataOwner = owner || 'guest';
    try { localStorage.setItem(KEYS.owner, JSON.stringify(dataOwner)); }
    catch (error) { console.warn('Не удалось сохранить метку владельца локальных данных.', error); }
  }
  function captureGuestSnapshot() {
    if (dataOwner !== 'guest' || session) return;
    try {
      localStorage.setItem('forma.guest.backup.v1', JSON.stringify({
        schema: 'forma-guest-v1',
        savedAt: new Date().toISOString(),
        ...localSnapshot()
      }));
    } catch (error) {
      console.warn('Не удалось сохранить гостевую резервную копию.', error);
    }
  }
  function applyLocalSnapshot(snapshot, owner = 'guest') {
    hydratingCloud = true;
    habits = snapshot && Array.isArray(snapshot.habits) ? snapshot.habits : seedHabits.map(habit => ({ ...habit }));
    logs = snapshot && snapshot.logs && typeof snapshot.logs === 'object' ? snapshot.logs : {};
    journal = snapshot && snapshot.journal && typeof snapshot.journal === 'object' ? snapshot.journal : {};
    reminders = snapshot && snapshot.reminders && typeof snapshot.reminders === 'object' ? snapshot.reminders : {};
    if (snapshot && (snapshot.language === 'en' || snapshot.language === 'ru')) language = snapshot.language;
    write(KEYS.language, language);
    write(KEYS.habits, habits);
    write(KEYS.logs, logs);
    write(KEYS.journal, journal);
    write(KEYS.reminders, reminders);
    if (snapshot && (snapshot.theme === 'light' || snapshot.theme === 'dark')) setTheme(snapshot.theme);
    setDataOwner(owner);
    hydratingCloud = false;
    renderAll();
  }
  function restoreGuestSnapshot() {
    const guest = read('forma.guest.backup.v1', null);
    if (guest && Array.isArray(guest.habits)) {
      applyLocalSnapshot(guest, 'guest');
    } else {
      applyLocalSnapshot({ habits: seedHabits.map(habit => ({ ...habit })), logs: {}, journal: {} }, 'guest');
    }
  }
  async function pushCloudData(silent = false) {
    if (!cloudConfigured() || !session || !session.user || hydratingCloud || cloudSyncInFlight) return;
    cloudSyncInFlight = true;
    const config = supabaseConfig();
    const payload = localSnapshot();
    try {
      await supabaseDataRequest('user_data?on_conflict=user_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: session.user.id, payload, updated_at: new Date().toISOString() })
      });
      cloudSyncStatus = 'synced';
      renderAccountUI();
      return true;
    } catch (error) {
      console.error('Ошибка облачной синхронизации Forma:', error);
      cloudSyncStatus = 'error';
      renderAccountUI();
      if (!silent) toast('Не удалось синхронизировать данные: ' + error.message);
      return false;
    } finally {
      cloudSyncInFlight = false;
    }
  }
  function scheduleCloudSync() {
    if (!session || !cloudConfigured() || hydratingCloud) return;
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => pushCloudData(true), 800);
  }
  async function syncAccountData() {
    if (!session || !session.user) return;
    cloudSyncStatus = 'checking';
    renderAccountUI();
    const localBeforeSync = localSnapshot();
    const wasGuest = dataOwner === 'guest';
    try {
      const rows = await supabaseDataRequest('user_data?select=payload,updated_at&user_id=eq.' + encodeURIComponent(session.user.id) + '&limit=1', { method: 'GET' });
      if (Array.isArray(rows) && rows.length && rows[0].payload && typeof rows[0].payload === 'object') {
        // Preserve local guest progress only when the current data really belongs to a guest.
        if (wasGuest) {
          try { localStorage.setItem('forma.guest.backup.v1', JSON.stringify({ schema: 'forma-guest-v1', savedAt: new Date().toISOString(), ...localBeforeSync })); }
          catch (error) { console.warn('Не удалось сохранить гостевую копию.', error); }
        }
        const remote = rows[0].payload;
        habits = Array.isArray(remote.habits) ? remote.habits : habits;
        logs = remote.logs && typeof remote.logs === 'object' ? remote.logs : {};
        journal = remote.journal && typeof remote.journal === 'object' ? remote.journal : {};
        reminders = remote.reminders && typeof remote.reminders === 'object' ? remote.reminders : {};
        if (remote.language === 'en' || remote.language === 'ru') language = remote.language;
        write(KEYS.language, language);
        hydratingCloud = true;
        write(KEYS.habits, habits); write(KEYS.logs, logs); write(KEYS.journal, journal); write(KEYS.reminders, reminders);
        if (remote.theme === 'light' || remote.theme === 'dark') setTheme(remote.theme);
        setDataOwner(session.user.id);
        cloudSyncStatus = 'synced';
        hydratingCloud = false;
        renderAll();
        renderAccountUI();
      } else {
        // A brand-new account receives the current guest data once; an existing account
        // never imports another profile's local cache implicitly.
        if (!wasGuest && dataOwner !== session.user.id) {
          applyLocalSnapshot({ habits: seedHabits.map(habit => ({ ...habit })), logs: {}, journal: {}, reminders: {}, theme: document.documentElement.dataset.theme || 'light' }, session.user.id);
        } else if (wasGuest) {
          try { localStorage.setItem('forma.guest.backup.v1', JSON.stringify({ schema: 'forma-guest-v1', savedAt: new Date().toISOString(), ...localBeforeSync })); }
          catch (error) { console.warn('Не удалось сохранить гостевую копию.', error); }
        }
        const oldHydrationState = hydratingCloud;
        hydratingCloud = false;
        const synced = await pushCloudData(true);
        hydratingCloud = oldHydrationState;
        if (!synced) {
          cloudSyncStatus = 'error';
          throw new Error('Не удалось сохранить данные в облако. Проверь настройки таблицы user_data и RLS.');
        }
        setDataOwner(session.user.id);
        cloudSyncStatus = 'synced';
      }
    } catch (error) {
      cloudSyncStatus = 'error';
      throw error;
    } finally {
      hydratingCloud = false;
      renderAll();
      renderAccountUI();
    }
  }

  function base64UrlEncode(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  async function createPkcePair() {
    if (!window.crypto || !crypto.subtle || !crypto.getRandomValues) {
      throw new Error('Для безопасного входа Google нужен современный браузер и HTTPS (или localhost).');
    }
    const random = new Uint8Array(64);
    crypto.getRandomValues(random);
    const verifier = base64UrlEncode(random);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return { verifier, challenge: base64UrlEncode(new Uint8Array(digest)) };
  }

  async function startGoogleSignIn() {
    if (!cloudConfigured()) {
      setAccountMessage('Сначала настрой Supabase: добавь URL и anon/publishable key в supabase-config.js. Затем включи Google в Authentication → Sign In / Providers.', 'error');
      return;
    }
    const button = $('#google-signin');
    if (button.disabled) return;
    button.disabled = true;
    setAccountMessage('Готовим безопасный вход через Google…');
    try {
      captureGuestSnapshot();
      const pair = await createPkcePair();
      sessionStorage.setItem('forma.oauth.pkce.verifier', pair.verifier);
      const config = supabaseConfig();
      const redirect = new URL(window.location.href);
      redirect.hash = '';
      const authorize = new URL(config.url + '/auth/v1/authorize');
      authorize.searchParams.set('provider', 'google');
      authorize.searchParams.set('redirect_to', redirect.toString());
      authorize.searchParams.set('scopes', 'openid email profile');
      authorize.searchParams.set('code_challenge', pair.challenge);
      authorize.searchParams.set('code_challenge_method', 's256');
      // This is the public Supabase publishable/anon key, never a secret key.
      authorize.searchParams.set('apikey', config.key);
      window.location.assign(authorize.toString());
    } catch (error) {
      console.error('Не удалось запустить Google-вход Forma:', error);
      sessionStorage.removeItem('forma.oauth.pkce.verifier');
      setAccountMessage(error.message || 'Не удалось начать вход через Google.', 'error');
      renderAccountUI();
    }
  }

  async function consumeGoogleCallback() {
    const callbackUrl = new URL(window.location.href);
    const rawHash = callbackUrl.hash.replace(/^#/, '');
    const fragment = new URLSearchParams(rawHash);
    const code = callbackUrl.searchParams.get('code');
    const tokenPresent = fragment.has('access_token') || fragment.has('refresh_token');
    const errorText = fragment.get('error_description') || fragment.get('error') ||
      callbackUrl.searchParams.get('error_description') || callbackUrl.searchParams.get('error');
    if (!code && !tokenPresent && !errorText) return '';

    // Remove one-time codes / tokens from the address bar before making further requests.
    const clean = new URL(callbackUrl.href);
    clean.hash = '';
    ['code', 'state', 'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider', 'provider_token', 'error', 'error_description', 'error_code'].forEach(key => clean.searchParams.delete(key));
    window.history.replaceState({}, document.title, clean.pathname + clean.search);

    if (errorText) {
      sessionStorage.removeItem('forma.oauth.pkce.verifier');
      throw new Error('Google-вход не завершён: ' + errorText.replace(/\+/g, ' '));
    }
    if (!cloudConfigured()) throw new Error('Supabase не настроен. Заполни supabase-config.js и повтори вход.');
    const config = supabaseConfig();
    let sessionData;

    if (code) {
      const verifier = sessionStorage.getItem('forma.oauth.pkce.verifier');
      sessionStorage.removeItem('forma.oauth.pkce.verifier');
      if (!verifier) throw new Error('Не найдена временная проверка PKCE. Начни вход через Google заново.');
      const response = await fetch(config.url + '/auth/v1/token?grant_type=pkce', {
        method: 'POST',
        headers: { apikey: config.key, Authorization: 'Bearer ' + config.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_code: code, code_verifier: verifier })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Не удалось обменять OAuth code на сессию:', response.status, data);
        throw new Error(data.msg || data.message || data.error_description || 'Не удалось завершить вход через Google. Проверь настройки OAuth и повтори попытку.');
      }
      sessionData = data;
    } else {
      // Backward compatibility for a session returned in the URL fragment.
      const accessToken = fragment.get('access_token');
      const refreshToken = fragment.get('refresh_token');
      if (!accessToken || !refreshToken) throw new Error('Google вернул неполную сессию. Попробуй войти ещё раз.');
      const response = await fetch(config.url + '/auth/v1/user', {
        headers: { apikey: config.key, Authorization: 'Bearer ' + accessToken }
      });
      const user = await response.json().catch(() => ({}));
      if (!response.ok || !user.id) {
        console.error('Не удалось получить Google-пользователя из Supabase:', response.status, user);
        throw new Error('Google подтвердил вход, но Forma не смогла загрузить профиль. Проверь настройки Supabase и попробуй снова.');
      }
      sessionData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: fragment.get('token_type') || 'bearer',
        expires_in: Number(fragment.get('expires_in') || 3600),
        user
      };
    }

    if (!keepSession(sessionData)) throw new Error('Не удалось сохранить сессию Google. Попробуй ещё раз.');
    toast('Вход через Google выполнен');
    return '';
  }

  async function submitAccount(event) {
    event.preventDefault();
    if (!cloudConfigured()) {
      setAccountMessage('Чтобы включить настоящие аккаунты, создай Supabase-проект и укажи URL и publishable/anon key в supabase-config.js.', 'error');
      return;
    }
    if (!session) captureGuestSnapshot();
    const email = $('#account-email').value.trim().toLowerCase();
    const password = $('#account-password').value;
    const submit = $('#account-submit');
    submit.disabled = true;
    submit.textContent = accountMode === 'login' ? 'Входим…' : 'Создаём…';
    setAccountMessage('Подключаемся к аккаунту…');
    try {
      if (accountMode === 'signup') {
        const data = await supabaseAuthRequest('signup', {
          email, password,
          options: { emailRedirectTo: window.location.href.split('#')[0] }
        });
        if (keepSession(data)) {
          await syncAccountData();
          $('#account-dialog').close();
          toast('Аккаунт создан. Данные будут синхронизироваться автоматически.');
        } else {
          setAccountMessage('Запрос регистрации принят. Проверь почту, подтверди адрес, затем войди сюда.', 'success');
        }
      } else {
        const data = await supabaseAuthRequest('token?grant_type=password', { email, password });
        if (!keepSession(data)) throw new Error('Сервис не вернул действующую сессию.');
        await syncAccountData();
        $('#account-dialog').close();
        toast('Ты вошёл(ла). Аккаунт подключён.');
      }
    } catch (error) {
      console.error('Ошибка аккаунта Forma:', error);
      setAccountMessage(error.message || 'Не удалось выполнить запрос.', 'error');
    } finally {
      submit.disabled = !cloudConfigured();
      renderAccountUI();
    }
  }
  async function signOutAccount() {
    if (session && session.access_token && cloudConfigured()) {
      try { await supabaseAuthRequest('logout', {}, session.access_token); }
      catch (error) { console.warn('Не удалось завершить серверную сессию:', error); }
    }
    clearTimeout(cloudTimer);
    session = null;
    localStorage.removeItem(KEYS.auth);
    cloudSyncStatus = 'local';
    restoreGuestSnapshot();
    renderAccountUI();
    $('#account-dialog').close();
    toast('Ты вышел(ла). Гостевые данные восстановлены; данные аккаунта остались в облаке.');
  }
  async function initializeAccount() {
    let callbackError = '';
    try {
      await consumeGoogleCallback();
    } catch (error) {
      callbackError = error.message || 'Не удалось завершить вход через Google.';
      console.error('Ошибка callback Google в Forma:', error);
    }
    renderAccountUI();
    if (callbackError) {
      $('#account-dialog').showModal();
      setAccountMessage(callbackError, 'error');
    }
    if (!cloudConfigured()) { hydratingCloud = false; return; }
    if (session && session.access_token) {
      try {
        await refreshAuthSessionIfNeeded();
        await syncAccountData();
      } catch (error) {
        console.error('Не удалось восстановить облачную сессию:', error);
        $('#profile-subtitle').textContent = 'Войди снова';
        $('#account-dialog').showModal();
        setAccountMessage('Не удалось загрузить облачные данные: ' + error.message, 'error');
      }
    }
    hydratingCloud = false;
  }
  async function refreshAuthSessionIfNeeded() {
    if (session && session.expires_at && session.expires_at < Math.floor(Date.now() / 1000) + 45) await refreshAuthSession();
  }
  function appendAssistantMessage(content, who = 'reply', extraClass = '') {
    const node = document.createElement('div');
    node.className = 'assistant-message ' + (who === 'user' ? 'assistant-user' : 'assistant-reply') + (extraClass ? ' ' + extraClass : '');
    node.textContent = who === 'user' ? content : translateValue(content);
    $('#assistant-messages').appendChild(node);
    $('#assistant-messages').scrollTop = $('#assistant-messages').scrollHeight;
    return node;
  }
  function openAssistant() {
    $('#assistant-panel').hidden = false;
    $('#assistant-fab').setAttribute('aria-expanded', 'true');
    setTimeout(() => $('#assistant-input').focus(), 60);
  }
  function closeAssistant() {
    $('#assistant-panel').hidden = true;
    $('#assistant-fab').setAttribute('aria-expanded', 'false');
  }
  async function askAssistant(rawText) {
    const text = String(rawText || '').trim();
    if (!text || assistantBusy) return;
    $('#assistant-input').value = '';
    appendAssistantMessage(text, 'user');
    assistantHistory.push({ role: 'user', content: text });
    if (!cloudConfigured()) {
      appendAssistantMessage('ИИ пока не подключён к серверу. Сначала настрой Supabase по инструкции в README: так ключ ИИ останется на сервере, а не в открытом JavaScript.', 'reply', 'assistant-error');
      return;
    }
    if (!session || !session.access_token) {
      appendAssistantMessage('Чтобы пользоваться персональным ИИ-помощником, сначала войди или создай аккаунт в Forma.', 'reply', 'assistant-error');
      return;
    }
    const config = supabaseConfig();
    assistantBusy = true;
    $('#assistant-send').disabled = true;
    $('#assistant-status').textContent = translateValue('Думаю…');
    const typing = appendAssistantMessage('Секунду, подбираю ответ…', 'reply', 'assistant-typing');
    try {
      await ensureFreshSession();
      const response = await fetch(config.url + '/functions/v1/' + config.aiFunctionName, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: config.key, Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({
          messages: assistantHistory.slice(-12),
          context: {
            date: todayKey(),
            completionPercent: rate(todayKey()),
            completedCount: doneCount(todayKey()),
            habits: habits.map(h => ({ name: h.name, category: h.category, doneToday: isDone(h.id, todayKey()) })).slice(0, 40)
          }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Функция ai-assistant не найдена в Supabase. Код в GitHub ещё нужно развернуть: см. README → «Развёртывание ИИ».');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Supabase отклонил запрос ИИ (' + response.status + '). Проверь, что ты вошёл(ла) в аккаунт и функция развёрнута с проверкой авторизации.');
        }
        throw new Error(data.error || data.message || 'Сервис ИИ ответил ошибкой (' + response.status + ').');
      }
      const answer = String(data.reply || data.answer || '').trim();
      if (!answer) throw new Error('ИИ вернул пустой ответ. Проверь настройки серверной функции.');
      typing.remove();
      assistantHistory.push({ role: 'assistant', content: answer });
      assistantHistory = assistantHistory.slice(-12);
      appendAssistantMessage(answer, 'reply');
      $('#assistant-status').textContent = translateValue('Готов помочь');
    } catch (error) {
      console.error('Ошибка ИИ-помощника Forma:', error);
      typing.remove();
      let message = error && error.message ? error.message : 'Не удалось получить ответ. Попробуй ещё раз.';
      if (error instanceof TypeError && /fetch/i.test(message)) {
        message = 'Браузер не смог подключиться к функции ai-assistant. Обычно это значит, что Edge Function ещё не развёрнута в Supabase или запрос остановил CORS. Проверь Supabase → Edge Functions → ai-assistant → Invocations / Logs, затем разверни функцию из supabase/functions/ai-assistant/index.ts и добавь серверный секрет OPENAI_API_KEY. См. README → «Развёртывание ИИ».';
      }
      appendAssistantMessage(message, 'reply', 'assistant-error');
      $('#assistant-status').textContent = translateValue('Нужно проверить подключение');
    } finally {
      assistantBusy = false;
      $('#assistant-send').disabled = false;
    }
  }

  function toast(message) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = translateValue(message);
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
  }
  function openHabitDialog(habit = null) {
    const form = $('#habit-form');
    form.reset();
    $('#habit-id').value = habit ? habit.id : '';
    $('#dialog-title').textContent = habit ? 'Изменить привычку' : 'Новая привычка';
    $('#habit-name').value = habit ? habit.name : '';
    $('#habit-description').value = habit ? habit.description || '' : '';
    $('#habit-category').value = habit ? habit.category : 'Здоровье';
    $('#habit-emoji').value = habit ? habit.emoji : '✨';
    $('#habit-dialog').showModal();
    applyLanguage();
    setTimeout(() => $('#habit-name').focus(), 40);
  }
  function closeHabitDialog() { $('#habit-dialog').close(); }
  function saveHabit(event) {
    event.preventDefault();
    const id = $('#habit-id').value;
    const name = $('#habit-name').value.trim();
    if (!name) return;
    const item = { id: id || uid(), name, description: $('#habit-description').value.trim(), category: $('#habit-category').value, emoji: $('#habit-emoji').value, createdAt: id ? (habits.find(h => h.id === id) || {}).createdAt || selectedDate : selectedDate };
    if (id) habits = habits.map(h => h.id === id ? item : h);
    else habits.push(item);
    write(KEYS.habits, habits);
    closeHabitDialog();
    renderAll();
    toast(id ? 'Привычка обновлена' : 'Привычка добавлена');
  }
  function deleteHabit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit || !window.confirm(translateValue('Удалить привычку «' + habit.name + '»? История её отметок тоже будет удалена.'))) return;
    habits = habits.filter(h => h.id !== id);
    if (reminders[id]) { delete reminders[id]; write(KEYS.reminders, reminders); }
    Object.keys(logs).forEach(day => {
      if (logs[day]) {
        delete logs[day][id];
        if (!Object.keys(logs[day]).length) delete logs[day];
      }
    });
    write(KEYS.habits, habits);
    saveLogs();
    renderAll();
    toast('Привычка удалена');
  }
  function saveJournal() {
    const text = $('#journal-entry').value;
    const mood = ($('#moods button.active') || {}).dataset?.mood || '';
    if (!text.trim() && !mood) delete journal[selectedDate];
    else journal[selectedDate] = { text, mood, updatedAt: new Date().toISOString() };
    write(KEYS.journal, journal);
    $('#save-state').textContent = translateValue('● Сохранено');
    $('#journal-count').textContent = Object.values(journal).filter(item => item.text && item.text.trim()).length;
  }
  function exportData() {
    const payload = { schema: 'forma-backup-v1', exportedAt: new Date().toISOString(), habits, logs, journal, reminders, language, theme: document.documentElement.dataset.theme || 'light' };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'forma-backup-' + todayKey() + '.json';
    link.click();
    URL.revokeObjectURL(url);
    toast('Резервная копия подготовлена');
  }
  async function importData(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.schema !== 'forma-backup-v1' || !Array.isArray(payload.habits) || typeof payload.logs !== 'object' || typeof payload.journal !== 'object') throw new Error('Неверный формат');
      if (!window.confirm(translateValue('Импорт заменит текущие привычки, отметки и дневник. Продолжить?'))) return;
      habits = payload.habits;
      logs = payload.logs || {};
      journal = payload.journal || {};
      reminders = payload.reminders && typeof payload.reminders === 'object' ? payload.reminders : {};
      if (payload.language === 'en' || payload.language === 'ru') language = payload.language;
      write(KEYS.language, language);
      write(KEYS.habits, habits); write(KEYS.logs, logs); write(KEYS.journal, journal); write(KEYS.reminders, reminders);
      if (payload.theme === 'dark' || payload.theme === 'light') setTheme(payload.theme);
      renderAll();
      toast('Резервная копия восстановлена');
    } catch (error) {
      console.error('Не удалось импортировать резервную копию:', error);
      toast('Файл не похож на резервную копию Forma');
    } finally {
      $('#restore-file').value = '';
    }
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    write(KEYS.theme, theme);
    if (session) scheduleCloudSync();
    $('#theme-toggle').textContent = theme === 'dark' ? '☀' : '☾';
    $('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#12151b' : '#f5f6f9');
  }

  document.addEventListener('click', event => {
    const communityAction = event.target.closest('[data-community-action]');
    if (communityAction) { handleCommunityAction(communityAction).catch(error => { console.error('Ошибка действия с друзьями Forma:', error); toast(error.message || 'Не удалось выполнить действие.'); }); return; }
    const nav = event.target.closest('[data-view]');
    if (nav) navigate(nav.dataset.view);
    const open = event.target.closest('[data-open]');
    if (open) navigate(open.dataset.open);
    const toggle = event.target.closest('[data-toggle]');
    if (toggle) toggleHabit(toggle.dataset.toggle);
    const edit = event.target.closest('[data-edit]');
    if (edit) openHabitDialog(habits.find(h => h.id === edit.dataset.edit));
    const del = event.target.closest('[data-delete]');
    if (del) deleteHabit(del.dataset.delete);
    const focusModeButton = event.target.closest('[data-focus-mode]');
    if (focusModeButton) setFocusMode(focusModeButton.dataset.focusMode);
    const accountTab = event.target.closest('[data-account-mode]');
    if (accountTab) setAccountMode(accountTab.dataset.accountMode);
    const askShortcut = event.target.closest('[data-ask]');
    if (askShortcut) {
      openAssistant();
      askAssistant(askShortcut.dataset.ask);
    }
    const filter = event.target.closest('[data-category]');
    if (filter && filter.closest('#today-filters')) {
      activeFilter = filter.dataset.category;
      renderToday();
      $$('#today-filters [data-category]').forEach(button => button.classList.toggle('active', button === filter));
    }
    const mood = event.target.closest('[data-mood]');
    if (mood) {
      $$('#moods button').forEach(button => button.classList.toggle('active', button === mood));
      saveJournal();
    }
    const prompt = event.target.closest('[data-prompt]');
    if (prompt) {
      const area = $('#journal-entry');
      area.value += (area.value.trim() ? '\n\n' : '') + prompt.dataset.prompt + ' ';
      area.focus();
      saveJournal();
    }
    const rangeButton = event.target.closest('[data-range]');
    if (rangeButton) {
      insightRange = Number(rangeButton.dataset.range);
      renderInsights();
      $$('[data-range]').forEach(button => button.classList.toggle('active', Number(button.dataset.range) === insightRange));
    }
  });
  $('#focus-toggle').addEventListener('click', toggleFocusTimer);
  $('#focus-reset').addEventListener('click', resetFocusTimer);
  $('#focus-habit').addEventListener('change', event => { focusHabitId = event.target.value; renderFocus(); });
  $('#enable-notifications').addEventListener('click', enableBrowserNotifications);
  document.addEventListener('change', event => {
    const toggle = event.target.closest('[data-reminder-toggle]');
    if (toggle) { setHabitReminder(toggle.dataset.reminderToggle, toggle.checked); return; }
    const timeInput = event.target.closest('[data-reminder-time]');
    if (timeInput) saveHabitReminderTime(timeInput.dataset.reminderTime, timeInput.value);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { tickFocusTimer(); checkHabitReminders(); }
  });
  setInterval(checkHabitReminders, 15000);
  $('#add-habit').addEventListener('click', () => openHabitDialog());
  $('#add-from-today').addEventListener('click', () => openHabitDialog());
  $('#close-dialog').addEventListener('click', closeHabitDialog);
  $('#cancel-dialog').addEventListener('click', closeHabitDialog);
  $('#habit-form').addEventListener('submit', saveHabit);
  $('#habit-sort').addEventListener('change', renderHabits);
  $('#prev-day').addEventListener('click', () => { selectedDate = addDays(selectedDate, -1); renderAll(); });
  $('#next-day').addEventListener('click', () => { if (selectedDate < todayKey()) selectedDate = addDays(selectedDate, 1); renderAll(); });
  $('#go-today').addEventListener('click', () => { selectedDate = todayKey(); renderAll(); });
  $('#journal-prev').addEventListener('click', () => { selectedDate = addDays(selectedDate, -1); renderAll(); });
  $('#journal-next').addEventListener('click', () => { if (selectedDate < todayKey()) selectedDate = addDays(selectedDate, 1); renderAll(); });
  $('#journal-today').addEventListener('click', () => { selectedDate = todayKey(); renderAll(); });
  $('#journal-entry').addEventListener('input', () => {
    $('#save-state').textContent = '● Сохраняется…';
    saveJournal();
  });
  $('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#language-toggle').addEventListener('click', () => setLanguage(language === 'en' ? 'ru' : 'en'));
  setInterval(() => { const dateNode = $('#top-date'); if (dateNode) dateNode.textContent = formatHeaderDateTime(); }, 15000);
  $('#backup-btn').addEventListener('click', exportData);
  $('#restore-btn').addEventListener('click', () => $('#restore-file').click());
  $('#profile-avatar').addEventListener('dblclick', () => $('#restore-file').click());
  $('#restore-file').addEventListener('change', event => importData(event.target.files && event.target.files[0]));
  $('#matrix-range').addEventListener('change', renderMatrix);
  $('#add-matrix-habit').addEventListener('click', () => openHabitDialog());
  $('#habit-matrix').addEventListener('change', event => {
    const checkbox = event.target.closest('[data-matrix-toggle]');
    if (!checkbox) return;
    setHabitState(checkbox.dataset.matrixToggle, checkbox.dataset.day, checkbox.checked);
  });

  $('#account-open').addEventListener('click', () => { renderAccountUI(); $('#account-dialog').showModal(); });
  $('#account-open-side').addEventListener('click', () => { renderAccountUI(); $('#account-dialog').showModal(); });
  $('#account-close').addEventListener('click', () => $('#account-dialog').close());
  $('#account-form').addEventListener('submit', submitAccount);
  $('#friend-profile-form').addEventListener('submit', saveCommunityProfile);
  $('#friend-search-form').addEventListener('submit', searchCommunity);
  $('#community-login-btn').addEventListener('click', () => { renderAccountUI(); $('#account-dialog').showModal(); });
  $('#google-signin').addEventListener('click', startGoogleSignIn);
  $('#account-logout').addEventListener('click', signOutAccount);

  $('#assistant-fab').addEventListener('click', () => {
    if ($('#assistant-panel').hidden) openAssistant();
    else closeAssistant();
  });
  $('#assistant-close').addEventListener('click', closeAssistant);
  $('#assistant-form').addEventListener('submit', event => {
    event.preventDefault();
    askAssistant($('#assistant-input').value);
  });
  $('#assistant-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      $('#assistant-form').requestSubmit();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAssistant();
  });

  const loadingStartedAt = Date.now();
  let loadingFinished = false;
  function finishLoadingScreen() {
    if (loadingFinished) return;
    loadingFinished = true;
    const remaining = Math.max(0, 520 - (Date.now() - loadingStartedAt));
    setTimeout(() => {
      const screen = $('#loading-screen');
      if (!screen) return;
      screen.classList.add('is-hidden');
      setTimeout(() => screen.remove(), 500);
    }, remaining);
  }
  const loadingFailsafe = setTimeout(finishLoadingScreen, 6500);
  const storedTheme = read(KEYS.theme, null);
  setTheme(storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  renderAll();
  initializeAccount().catch(error => {
    hydratingCloud = false;
    console.error('Не удалось инициализировать аккаунт Forma:', error);
    renderAccountUI();
  }).finally(() => {
    clearTimeout(loadingFailsafe);
    finishLoadingScreen();
  });
})();