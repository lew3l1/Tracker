(() => {
  'use strict';

  const KEYS = { habits: 'forma.habits.v1', logs: 'forma.logs.v1', journal: 'forma.journal.v1', theme: 'forma.theme.v1', auth: 'forma.auth.session.v1' };
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
  function fmt(key, options = { day: 'numeric', month: 'short' }) {
    return parseDate(key).toLocaleDateString('ru-RU', options).replace(' г.', '');
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
      if ([KEYS.habits, KEYS.logs, KEYS.journal].includes(key)) scheduleCloudSync();
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
  let hydratingCloud = true;
  let cloudTimer = 0;
  let cloudSyncInFlight = false;
  let accountMode = 'login';
  let assistantBusy = false;
  let assistantHistory = [];

  let habits = read(KEYS.habits, null);
  if (!Array.isArray(habits)) {
    habits = seedHabits;
    write(KEYS.habits, habits);
  }
  let logs = read(KEYS.logs, {});
  let journal = read(KEYS.journal, {});
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
    if (!['today', 'habits', 'table', 'insights', 'journal'].includes(view)) return;
    activeView = view;
    $$('.view').forEach(section => {
      const active = section.id === 'view-' + view;
      section.hidden = !active;
      section.classList.toggle('active', active);
    });
    $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    $('#crumb').textContent = ({ today: 'Мой день', habits: 'Привычки', table: 'Таблица', insights: 'Моя динамика', journal: 'Дневник' })[view];
    renderAll();
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
    $('#top-date').textContent = fmt(todayKey(), { day: 'numeric', month: 'long' });
    $('#today-eyebrow').textContent = fmt(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' }).toLocaleUpperCase('ru-RU');
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
  function renderAll() {
    renderHeader();
    renderToday();
    renderHabits();
    renderMatrix();
    renderInsights();
    renderJournal();
    renderAccountUI();
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
    node.textContent = message;
    node.className = 'account-message' + (type ? ' ' + type : '');
  }
  function renderAccountUI() {
    const email = session && session.user && session.user.email;
    const initial = email ? email.trim().charAt(0).toUpperCase() : 'F';
    $('#profile-avatar').textContent = initial;
    $('#profile-title').textContent = email ? email.split('@')[0] : 'Гость';
    $('#profile-subtitle').textContent = email ? 'Облачный аккаунт' : 'Данные в браузере';
    $('#account-open').title = email ? 'Аккаунт: ' + email : 'Войти или создать аккаунт';
    $('#account-logout').hidden = !email;
    $('#account-submit').disabled = !cloudConfigured();
    const note = $('#account-cloud-note');
    if (!cloudConfigured()) {
      note.textContent = 'Облачный аккаунт ещё не настроен. Пока Forma хранит данные только в этом браузере. Для регистрации подключи Supabase в supabase-config.js и выполни SQL из supabase/migrations.';
      setAccountMessage('Настрой Supabase, чтобы включить регистрацию и синхронизацию.', '');
    } else if (email) {
      note.textContent = 'Ты вошёл(ла) как ' + email + '. Привычки и дневник синхронизируются с личной строкой в базе данных.';
      setAccountMessage('Аккаунт подключён.', 'success');
    } else {
      note.textContent = 'Создай аккаунт, чтобы хранить привычки в облаке и открывать их на других устройствах.';
      if ($('#account-message').textContent.startsWith('Настрой Supabase')) setAccountMessage('', '');
    }
    $$('#account-form input').forEach(input => { input.disabled = !cloudConfigured(); });
    $('#account-submit').textContent = accountMode === 'login' ? 'Войти' : 'Создать аккаунт';
    $('#account-password').autocomplete = accountMode === 'login' ? 'current-password' : 'new-password';
    $$('#account-dialog [data-account-mode]').forEach(button => button.classList.toggle('active', button.dataset.accountMode === accountMode));
  }
  function setAccountMode(mode) {
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
      if (response.status === 404 || data.code === 'PGRST205') throw new Error('Таблица user_data ещё не создана. Выполни SQL из supabase/migrations/ в Supabase SQL Editor.');
      throw new Error(data.message || data.details || data.hint || 'Ошибка базы данных (' + response.status + ').');
    }
    return data;
  }
  function localSnapshot() {
    return { habits, logs, journal, theme: document.documentElement.dataset.theme || 'light' };
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
      if (!silent) $('#profile-subtitle').textContent = 'Синхронизировано';
    } catch (error) {
      console.error('Ошибка облачной синхронизации Forma:', error);
      $('#profile-subtitle').textContent = 'Нет синхронизации';
      if (!silent) toast('Не удалось синхронизировать данные: ' + error.message);
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
    const localBeforeSync = localSnapshot();
    try {
      const rows = await supabaseDataRequest('user_data?select=payload,updated_at&user_id=eq.' + encodeURIComponent(session.user.id) + '&limit=1', { method: 'GET' });
      if (Array.isArray(rows) && rows.length && rows[0].payload && typeof rows[0].payload === 'object') {
        // Keep a recoverable copy of guest/local progress before switching to this account.
        try { localStorage.setItem('forma.guest.backup.v1', JSON.stringify({ savedAt: new Date().toISOString(), ...localBeforeSync })); } catch (error) { console.warn('Не удалось сохранить гостевую копию.', error); }
        const remote = rows[0].payload;
        habits = Array.isArray(remote.habits) ? remote.habits : habits;
        logs = remote.logs && typeof remote.logs === 'object' ? remote.logs : {};
        journal = remote.journal && typeof remote.journal === 'object' ? remote.journal : {};
        hydratingCloud = true;
        write(KEYS.habits, habits); write(KEYS.logs, logs); write(KEYS.journal, journal);
        if (remote.theme === 'light' || remote.theme === 'dark') setTheme(remote.theme);
        hydratingCloud = false;
        renderAll();
        $('#profile-subtitle').textContent = 'Синхронизировано';
      } else {
        const oldHydrationState = hydratingCloud;
        hydratingCloud = false;
        await pushCloudData(true);
        hydratingCloud = oldHydrationState;
      }
    } finally {
      hydratingCloud = false;
      renderAll();
      renderAccountUI();
    }
  }
  async function submitAccount(event) {
    event.preventDefault();
    if (!cloudConfigured()) {
      setAccountMessage('Чтобы включить настоящие аккаунты, создай Supabase-проект и укажи URL и publishable/anon key в supabase-config.js.', 'error');
      return;
    }
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
    session = null;
    localStorage.removeItem(KEYS.auth);
    renderAccountUI();
    $('#account-dialog').close();
    toast('Ты вышел(ла). Локальные данные остались в этом браузере.');
  }
  async function initializeAccount() {
    renderAccountUI();
    if (!cloudConfigured()) { hydratingCloud = false; return; }
    if (session && session.access_token) {
      try {
        await refreshAuthSessionIfNeeded();
        await syncAccountData();
      } catch (error) {
        console.error('Не удалось восстановить облачную сессию:', error);
        $('#profile-subtitle').textContent = 'Войди снова';
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
    node.textContent = content;
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
    $('#assistant-status').textContent = 'Думаю…';
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
      if (!response.ok) throw new Error(data.error || data.message || (response.status === 404 ? 'Функция ИИ ещё не развёрнута. Следуй разделу AI в README.' : 'Сервис ИИ ответил ошибкой (' + response.status + ').'));
      const answer = String(data.reply || data.answer || '').trim();
      if (!answer) throw new Error('ИИ вернул пустой ответ. Проверь настройки серверной функции.');
      typing.remove();
      assistantHistory.push({ role: 'assistant', content: answer });
      assistantHistory = assistantHistory.slice(-12);
      appendAssistantMessage(answer, 'reply');
      $('#assistant-status').textContent = 'Готов помочь';
    } catch (error) {
      console.error('Ошибка ИИ-помощника Forma:', error);
      typing.remove();
      appendAssistantMessage(error.message || 'Не удалось получить ответ. Попробуй ещё раз.', 'reply', 'assistant-error');
      $('#assistant-status').textContent = 'Нужно проверить подключение';
    } finally {
      assistantBusy = false;
      $('#assistant-send').disabled = false;
    }
  }

  function toast(message) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
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
    if (!habit || !window.confirm('Удалить привычку «' + habit.name + '»? История её отметок тоже будет удалена.')) return;
    habits = habits.filter(h => h.id !== id);
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
    $('#save-state').textContent = '● Сохранено';
    $('#journal-count').textContent = Object.values(journal).filter(item => item.text && item.text.trim()).length;
  }
  function exportData() {
    const payload = { schema: 'forma-backup-v1', exportedAt: new Date().toISOString(), habits, logs, journal, theme: document.documentElement.dataset.theme || 'light' };
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
      if (!window.confirm('Импорт заменит текущие привычки, отметки и дневник. Продолжить?')) return;
      habits = payload.habits;
      logs = payload.logs || {};
      journal = payload.journal || {};
      write(KEYS.habits, habits); write(KEYS.logs, logs); write(KEYS.journal, journal);
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
    $('#theme-toggle').textContent = theme === 'dark' ? '☀' : '☾';
    $('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#12151b' : '#f5f6f9');
  }

  document.addEventListener('click', event => {
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

  const storedTheme = read(KEYS.theme, null);
  setTheme(storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  renderAll();
  initializeAccount().catch(error => {
    hydratingCloud = false;
    console.error('Не удалось инициализировать аккаунт Forma:', error);
    renderAccountUI();
  });
})();