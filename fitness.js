const EXERCISES_KEY = 'fitnessSessions';

const EXERCISE_DB = [
  { name: 'Bench Press',               group: 'Chest' },
  { name: 'Incline Bench Press',        group: 'Chest' },
  { name: 'Decline Bench Press',        group: 'Chest' },
  { name: 'Dumbbell Fly',               group: 'Chest' },
  { name: 'Cable Fly',                  group: 'Chest' },
  { name: 'Push-Up',                    group: 'Chest' },
  { name: 'Deadlift',                   group: 'Back' },
  { name: 'Pull-Up',                    group: 'Back' },
  { name: 'Chin-Up',                    group: 'Back' },
  { name: 'Barbell Row',                group: 'Back' },
  { name: 'Dumbbell Row',               group: 'Back' },
  { name: 'Lat Pulldown',               group: 'Back' },
  { name: 'Seated Cable Row',           group: 'Back' },
  { name: 'T-Bar Row',                  group: 'Back' },
  { name: 'Overhead Press',             group: 'Shoulders' },
  { name: 'Dumbbell Shoulder Press',    group: 'Shoulders' },
  { name: 'Lateral Raise',              group: 'Shoulders' },
  { name: 'Front Raise',                group: 'Shoulders' },
  { name: 'Face Pull',                  group: 'Shoulders' },
  { name: 'Arnold Press',               group: 'Shoulders' },
  { name: 'Barbell Curl',               group: 'Arms' },
  { name: 'Dumbbell Curl',              group: 'Arms' },
  { name: 'Hammer Curl',                group: 'Arms' },
  { name: 'Preacher Curl',              group: 'Arms' },
  { name: 'Tricep Pushdown',            group: 'Arms' },
  { name: 'Skull Crusher',              group: 'Arms' },
  { name: 'Overhead Tricep Extension',  group: 'Arms' },
  { name: 'Dips',                       group: 'Arms' },
  { name: 'Squat',                      group: 'Legs' },
  { name: 'Front Squat',                group: 'Legs' },
  { name: 'Leg Press',                  group: 'Legs' },
  { name: 'Romanian Deadlift',          group: 'Legs' },
  { name: 'Leg Curl',                   group: 'Legs' },
  { name: 'Leg Extension',              group: 'Legs' },
  { name: 'Lunge',                      group: 'Legs' },
  { name: 'Bulgarian Split Squat',      group: 'Legs' },
  { name: 'Calf Raise',                 group: 'Legs' },
  { name: 'Plank',                      group: 'Core' },
  { name: 'Crunch',                     group: 'Core' },
  { name: 'Cable Crunch',               group: 'Core' },
  { name: 'Hanging Leg Raise',          group: 'Core' },
  { name: 'Ab Rollout',                 group: 'Core' },
  { name: 'Treadmill',                  group: 'Cardio' },
  { name: 'Cycling',                    group: 'Cardio' },
  { name: 'Rowing Machine',             group: 'Cardio' },
  { name: 'Jump Rope',                  group: 'Cardio' },
];

const searchInput   = document.getElementById('exerciseSearch');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResults.classList.add('hidden'); return; }

  const matches = EXERCISE_DB.filter(e => e.name.toLowerCase().includes(q)).slice(0, 8);
  const exactMatch = EXERCISE_DB.some(e => e.name.toLowerCase() === q);
  const typedName = searchInput.value.trim();

  if (!matches.length && !typedName) { searchResults.classList.add('hidden'); return; }

  const matchHTML = matches.map(e => `
    <div class="search-result-item" data-name="${e.name}">
      <span>${e.name}</span>
      <span class="result-group">${e.group}</span>
    </div>
  `).join('');

  const customHTML = !exactMatch && typedName ? `
    <div class="search-result-item search-result-custom" data-name="${typedName}">
      <span>Add "<strong>${typedName}</strong>"</span>
      <span class="result-group">Custom</span>
    </div>
  ` : '';

  searchResults.innerHTML = matchHTML + customHTML;

  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      addExerciseRow(item.dataset.name);
      searchInput.value = '';
      searchResults.classList.add('hidden');
    });
  });

  searchResults.classList.remove('hidden');

  searchInput.onkeydown = e => {
    if (e.key === 'Enter' && typedName) {
      addExerciseRow(typedName);
      searchInput.value = '';
      searchResults.classList.add('hidden');
    }
  };
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) searchResults.classList.add('hidden');
});

document.getElementById('newSession').addEventListener('click', () => {
  document.getElementById('homeScreen').style.display = 'none';
  const s = document.getElementById('sessionScreen');
  s.style.display = 'flex';
  document.getElementById('exerciseList').innerHTML = '';
  searchInput.value = '';
  searchResults.classList.add('hidden');
});

document.getElementById('sessionBack').addEventListener('click', () => {
  document.getElementById('sessionScreen').style.display = 'none';
  document.getElementById('homeScreen').style.display = 'flex';
});

document.getElementById('loadSession').addEventListener('click', () => {
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('loadScreen').style.display = 'flex';
  renderSessionList();
});

document.getElementById('loadBack').addEventListener('click', () => {
  document.getElementById('loadScreen').style.display = 'none';
  document.getElementById('homeScreen').style.display = 'flex';
});

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function renderSessionList() {
  const container = document.getElementById('sessionList');
  const all = JSON.parse(localStorage.getItem(EXERCISES_KEY) || '[]').slice().reverse();

  if (!all.length) {
    container.innerHTML = '<div class="empty-state">No sessions saved yet</div>';
    return;
  }

  container.innerHTML = all.map((session, i) => {
    const exerciseCount = session.exercises.length;
    const setCount = session.exercises.reduce((n, e) => n + e.sets.length, 0);

    const detail = session.exercises.map(ex => {
      const equipLine = ex.equipment ? `<div class="detail-equip">${ex.equipment}</div>` : '';
      const setRows = ex.sets.map((s, si) => {
        const parts = [];
        if (s.reps)   parts.push(`<span class="detail-val">${s.reps} reps</span>`);
        if (s.weight) parts.push(`<span class="detail-val">${s.weight} kg</span>`);
        if (s.rest)   parts.push(`<span class="detail-val">${s.rest}s</span>`);
        return `<div class="detail-set-row">
          <span class="detail-set-num">Set ${si + 1}</span>
          ${parts.join('<span class="detail-dot"> · </span>')}
        </div>`;
      }).join('');
      return `<div class="detail-exercise">
        <div class="detail-exercise-name">${ex.name}</div>
        ${equipLine}
        ${setRows}
      </div>`;
    }).join('');

    return `<div class="session-card" data-index="${i}">
      <div class="session-card-header">
        <div>
          <div class="session-date">${formatDate(session.date)}</div>
          <div class="session-meta">${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''} · ${setCount} sets</div>
        </div>
        <span class="session-chevron">›</span>
      </div>
      <div class="session-detail">${detail}</div>
    </div>`;
  }).join('');

  container.querySelectorAll('.session-card').forEach(card => {
    card.querySelector('.session-card-header').addEventListener('click', () => {
      card.classList.toggle('open');
    });
  });
}

function readSets(row) {
  return Array.from(row.querySelectorAll('.set-row')).map((s, i) => {
    const repsChip   = s.querySelector('.reps-chips .chip.selected');
    const weightChip = s.querySelector('.weight-chips .chip.selected');
    const restChip   = s.querySelector('.rest-chips .chip.selected');
    const typeInputs = s.querySelectorAll('.chip-type-input');
    return {
      num:    i + 1,
      reps:   repsChip   ? repsChip.dataset.reps     : typeInputs[0]?.value || '',
      weight: weightChip ? weightChip.dataset.weight : typeInputs[1]?.value || '',
      rest:   restChip   ? restChip.dataset.rest     : typeInputs[2]?.value || '',
    };
  });
}

function showSummary(row) {
  const sets = readSets(row);
  const editor = row.querySelector('.exercise-editor');
  editor.classList.add('hidden');

  let summaryEl = row.querySelector('.exercise-summary');
  if (!summaryEl) {
    summaryEl = document.createElement('div');
    summaryEl.className = 'exercise-summary';
    row.appendChild(summaryEl);
  }

  const equip = row.dataset.equipment ? ` — ${row.dataset.equipment}` : '';
  const lines = sets.map(s => {
    const parts = [];
    if (s.reps)   parts.push(`${s.reps} reps`);
    if (s.weight) parts.push(`${s.weight} kg`);
    if (s.rest)   parts.push(`${s.rest}s rest`);
    return `Set ${s.num}  ·  ${parts.join('  ·  ')}`;
  });

  summaryEl.innerHTML = lines.map(line => {
    const [setNum, ...rest] = line.split('  ·  ');
    return `<div class="summary-row">
      <span class="summary-set-num">${setNum}</span>
      ${rest.map(p => `<span class="summary-val">${p}</span>`).join('<span class="summary-dot"> · </span>')}
    </div>`;
  }).join('') + `
    <div class="summary-footer">
      <button class="btn-copy">Copy</button>
    </div>`;

  summaryEl.querySelector('.btn-copy').addEventListener('click', () => {
    const text = `${row.dataset.name}${equip}\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = summaryEl.querySelector('.btn-copy');
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    });
  });

  summaryEl.classList.remove('hidden');
}

const EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'EZ Bar', 'Smith Machine', 'Resistance Band', 'Trap Bar'];

function addExerciseRow(name) {
  const list = document.getElementById('exerciseList');
  const row = document.createElement('div');
  row.className = 'exercise-row';
  row.dataset.name = name;

  const equipChips = EQUIPMENT.map(e =>
    `<div class="equip-chip" data-equip="${e}">${e}</div>`
  ).join('');

  row.innerHTML = `
    <div class="exercise-row-header">
      <div class="exercise-row-name">${name}</div>
      <button class="btn-edit hidden">Edit</button>
    </div>
    <div class="equipment-row">${equipChips}</div>
    <div class="exercise-editor">
      <div class="sets-table"></div>
      <button class="add-set-btn">+ Add Set</button>
      <div class="exercise-actions">
        <button class="btn-complete">Complete</button>
      </div>
    </div>
  `;

  row.querySelectorAll('.equip-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      row.querySelectorAll('.equip-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      row.dataset.equipment = chip.dataset.equip;
    });
  });

  row.querySelector('.add-set-btn').addEventListener('click', () => addSetRow(row));

  row.querySelector('.btn-complete').addEventListener('click', () => {
    showSummary(row);
    row.querySelector('.btn-edit').classList.remove('hidden');
  });

  row.querySelector('.btn-edit').addEventListener('click', () => {
    row.querySelector('.exercise-summary')?.classList.add('hidden');
    row.querySelector('.exercise-editor').classList.remove('hidden');
    row.querySelector('.btn-edit').classList.add('hidden');
  });

  addSetRow(row);
  list.appendChild(row);
}

const WEIGHT_CHIPS = [];
for (let w = 2.5; w <= 100; w += 2.5) WEIGHT_CHIPS.push(w % 1 === 0 ? w : w.toFixed(1));

const REST_CHIPS = [
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '1m',  value: 60 },
  { label: '90s', value: 90 },
  { label: '2m',  value: 120 },
  { label: '3m',  value: 180 },
];

function makeChips(items, dataKey, cls = '') {
  return items.map(item => {
    const label = item.label ?? item;
    const val   = item.value ?? item;
    return `<div class="chip ${cls}" data-${dataKey}="${val}">${label}</div>`;
  }).join('');
}

function bindChips(container, dataKey, input) {
  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      if (input) input.value = chip.dataset[dataKey];
    });
  });

  if (input) {
    input.addEventListener('input', () => {
      const val = input.value.trim();
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      const match = [...container.querySelectorAll('.chip')]
        .find(c => String(c.dataset[dataKey]) === String(val));
      if (match) {
        match.classList.add('selected');
        match.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }
}

function addSetRow(exerciseRow) {
  const table = exerciseRow.querySelector('.sets-table');
  const setNum = table.querySelectorAll('.set-row').length + 1;

  const setRow = document.createElement('div');
  setRow.className = 'set-row';
  setRow.innerHTML = `
    <span class="set-num">Set ${setNum}</span>
    <div class="chip-row-wrap">
      <span class="chip-row-label">Reps</span>
      <input class="chip-type-input" type="number" min="1" placeholder="—" />
      <div class="chip-row reps-chips">${makeChips(Array.from({length:15},(_,i)=>i+1), 'reps')}</div>
    </div>
    <div class="chip-row-wrap">
      <span class="chip-row-label">kg</span>
      <input class="chip-type-input" type="number" min="0" step="0.5" placeholder="—" />
      <div class="chip-row weight-chips">${makeChips(WEIGHT_CHIPS, 'weight')}</div>
    </div>
    <div class="chip-row-wrap">
      <span class="chip-row-label">Rest</span>
      <input class="chip-type-input" type="number" min="0" placeholder="—" />
      <div class="chip-row rest-chips">${makeChips(REST_CHIPS, 'rest')}</div>
    </div>
  `;

  const inputs = setRow.querySelectorAll('.chip-type-input');
  bindChips(setRow.querySelector('.reps-chips'),   'reps',   inputs[0]);
  bindChips(setRow.querySelector('.weight-chips'), 'weight', inputs[1]);
  bindChips(setRow.querySelector('.rest-chips'),   'rest',   inputs[2]);

  table.appendChild(setRow);
}

document.getElementById('saveSessionBtn').addEventListener('click', () => {
  const rows = document.querySelectorAll('.exercise-row');
  if (!rows.length) return;

  const exercises = Array.from(rows).map(row => {
    const sets = readSets(row);
    return { name: row.dataset.name, equipment: row.dataset.equipment || '', sets };
  });

  const session = { date: new Date().toISOString(), exercises };
  const all = JSON.parse(localStorage.getItem(EXERCISES_KEY) || '[]');
  all.push(session);
  localStorage.setItem(EXERCISES_KEY, JSON.stringify(all));

  document.getElementById('sessionScreen').style.display = 'none';
  document.getElementById('homeScreen').style.display = 'flex';
});
