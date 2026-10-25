(() => {
  'use strict';

  const KEYS = { habits: 'forma.habits.v1', logs: 'forma.logs.v1', journal: 'forma.journal.v1', theme: 'forma.theme.v1' };
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
    if (!['today', 'habits', 'insights', 'journal'].includes(view)) return;
    activeView = view;
    $$('.view').forEach(section => {
      const active = section.id === 'view-' + view;
      section.hidden = !active;
      section.classList.toggle('active', active);
    });
    $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    $('#crumb').textContent = ({ today: 'Мой день', habits: 'Привычки', insights: 'Моя динамика', journal: 'Дневник' })[view];
    renderAll();
  }
  function toggleHabit(id) {
    logs[selectedDate] ||= {};
    logs[selectedDate][id] = !logs[selectedDate][id];
    if (!logs[selectedDate][id]) delete logs[selectedDate][id];
    if (!Object.keys(logs[selectedDate]).length) delete logs[selectedDate];
    saveLogs();
    renderAll();
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
    renderInsights();
    renderJournal();
    $('#go-today').disabled = selectedDate === todayKey();
    $('#journal-today').disabled = selectedDate === todayKey();
    $$('[data-range]').forEach(button => button.classList.toggle('active', Number(button.dataset.range) === insightRange));
    $$('#today-filters [data-category]').forEach(button => button.classList.toggle('active', button.dataset.category === activeFilter));
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
      $$('#insights-placeholder [data-range]').forEach(button => button.classList.toggle('active', button === rangeButton));
      $$('[data-range]').forEach(button => button.classList.toggle('active', button === rangeButton));
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
  $('.sidebar-bottom .avatar').addEventListener('dblclick', () => $('#restore-file').click());
  $('#restore-file').addEventListener('change', event => importData(event.target.files && event.target.files[0]));
  const storedTheme = read(KEYS.theme, null);
  setTheme(storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  renderAll();
})();