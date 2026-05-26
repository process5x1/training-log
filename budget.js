const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

let current = new Date();
let viewYear  = current.getFullYear();
let viewMonth = current.getMonth();
let selectedDate = null;

function toDateStr(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

function getEntries(dateStr) {
  return JSON.parse(localStorage.getItem('budget_' + dateStr) || '[]');
}

function saveEntries(dateStr, entries) {
  localStorage.setItem('budget_' + dateStr, JSON.stringify(entries));
}

function getPeriod() {
  return JSON.parse(localStorage.getItem('budget_period') || 'null');
}

function getPeriodTotal(period) {
  let total = 0;
  const from = parseDate(period.from);
  const to   = parseDate(period.to);
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    getEntries(toDateStr(new Date(d))).forEach(e => total += e.val);
  }
  return total;
}

function renderBudgetCard() {
  const period = getPeriod();
  if (!period) {
    document.getElementById('periodLabel').textContent = 'No budget set — tap "Set period"';
    document.getElementById('statBudget').textContent    = '—';
    document.getElementById('statSpent').textContent     = '£0';
    document.getElementById('statRemaining').textContent = '—';
    document.getElementById('statAvgSpent').textContent  = '—';
    document.getElementById('statAvgLeft').textContent   = '—';
    document.getElementById('progressFill').style.width  = '0%';
    document.getElementById('progressFill').className    = 'progress-fill';
    return;
  }

  const todayStr = toDateStr(current);
  const spent    = getPeriodTotal(period);
  const budget   = period.amount;
  const remaining = budget - spent;

  const totalDays   = daysBetween(period.from, period.to) + 1;
  const daysElapsed = Math.max(1, Math.min(daysBetween(period.from, todayStr) + 1, totalDays));
  const daysLeft    = Math.max(0, daysBetween(todayStr, period.to));

  const avgSpent = spent / daysElapsed;
  const avgLeft  = daysLeft > 0 ? remaining / daysLeft : 0;
  const pct      = Math.min((spent / budget) * 100, 100);

  const fromParts = period.from.split('-');
  const toParts   = period.to.split('-');
  document.getElementById('periodLabel').textContent =
    `${parseInt(fromParts[2])} ${MONTHS[parseInt(fromParts[1])-1].slice(0,3)} – ${parseInt(toParts[2])} ${MONTHS[parseInt(toParts[1])-1].slice(0,3)} ${toParts[0]}`;

  document.getElementById('statBudget').textContent = `£${budget.toLocaleString()}`;
  document.getElementById('statSpent').textContent  = `£${spent.toFixed(2)}`;

  const remEl = document.getElementById('statRemaining');
  remEl.textContent = `£${Math.abs(remaining).toFixed(2)}`;
  remEl.className   = 'budget-stat-val' + (remaining < 0 ? ' over' : remaining / budget < 0.2 ? ' warning' : '');

  document.getElementById('statAvgSpent').textContent = `£${avgSpent.toFixed(2)}`;
  document.getElementById('statAvgLeft').textContent  = daysLeft > 0 ? `£${avgLeft.toFixed(2)}` : '—';

  const fill = document.getElementById('progressFill');
  fill.style.width = pct + '%';
  fill.className   = 'progress-fill' + (pct >= 100 ? ' over' : pct >= 80 ? ' warning' : '');
}

function toggleSetForm() {
  const form = document.getElementById('setForm');
  form.classList.toggle('visible');
  if (form.classList.contains('visible')) {
    const period = getPeriod();
    if (period) {
      document.getElementById('fromDate').value  = period.from;
      document.getElementById('toDate').value    = period.to;
      document.getElementById('budgetAmt').value = period.amount;
    }
  }
}

function savePeriod() {
  const from   = document.getElementById('fromDate').value;
  const to     = document.getElementById('toDate').value;
  const amount = parseFloat(document.getElementById('budgetAmt').value);
  if (!from || !to || !amount || amount <= 0 || from > to) return;
  localStorage.setItem('budget_period', JSON.stringify({ from, to, amount }));
  document.getElementById('setForm').classList.remove('visible');
  renderBudgetCard();
  renderCalendar();
}

function renderCalendar() {
  document.getElementById('monthLabel').textContent = MONTHS[viewMonth] + ' ' + viewYear;
  const cal = document.getElementById('calendar');
  cal.innerHTML = DAYS.map(d => `<div class="day-header">${d}</div>`).join('');

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr    = toDateStr(current);
  const period      = getPeriod();

  for (let i = 0; i < firstDay; i++) cal.innerHTML += `<div class="day empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr   = toDateStr(new Date(viewYear, viewMonth, d));
    const hasSpend  = getEntries(dateStr).length > 0;
    const isToday   = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const inPeriod  = period && dateStr >= period.from && dateStr <= period.to;

    cal.innerHTML += `<div class="day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${hasSpend ? ' has-spend' : ''}${inPeriod && !isSelected ? ' in-period' : ''}" onclick="selectDate('${dateStr}')">
      <div class="day-num">${d}</div>
      ${hasSpend ? '<div class="day-dot"></div>' : ''}
    </div>`;
  }
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  renderCalendar();
  renderPanel();
}

function renderPanel() {
  if (!selectedDate) return;
  document.getElementById('panel').classList.add('visible');

  const [y, m, d] = selectedDate.split('-');
  document.getElementById('panelDate').textContent =
    MONTHS[parseInt(m) - 1] + ' ' + parseInt(d) + ', ' + y;

  const entries = getEntries(selectedDate);
  const t = entries.reduce((s, e) => s + e.val, 0);
  document.getElementById('totalSpend').textContent = '£' + t.toFixed(2);

  document.getElementById('entriesList').innerHTML = entries.slice().reverse().map((e, ri) => {
    const i = entries.length - 1 - ri;
    return `<div class="entry-item">
      <div class="entry-time">${e.time}</div>
      <div class="entry-val">£${e.val.toFixed(2)}</div>
      <button class="entry-del" onclick="deleteEntry(${i})">✕</button>
    </div>`;
  }).join('');
}

function addValue() {
  const input = document.getElementById('valueInput');
  const val   = parseFloat(input.value);
  if (!val || val <= 0 || !selectedDate) return;
  const entries = getEntries(selectedDate);
  const now     = new Date();
  entries.push({ val, time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  saveEntries(selectedDate, entries);
  input.value = '';
  renderCalendar();
  renderPanel();
  renderBudgetCard();
}

function deleteEntry(i) {
  const entries = getEntries(selectedDate);
  entries.splice(i, 1);
  saveEntries(selectedDate, entries);
  renderCalendar();
  renderPanel();
  renderBudgetCard();
}

function changeMonth(dir) {
  viewMonth += dir;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
  selectedDate = null;
  document.getElementById('panel').classList.remove('visible');
  renderCalendar();
}

renderCalendar();
renderBudgetCard();
