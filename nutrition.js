const STORAGE_KEY  = 'nutritionLog_v1';
const SETTINGS_KEY = 'nutritionSettings';

let selectedFood  = null;
let selectedUnit  = 'g';
let editingIndex  = null;
let scanner       = null;
let dateOffset    = 0;

function getSettings() {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
}

function getTargets() {
  const s = getSettings();
  return { calories: s.calories || 2000, protein: s.protein || 150, carbs: s.carbs || 200, fat: s.fat || 65 };
}

function getDateKey() {
  const d = new Date();
  d.setDate(d.getDate() + dateOffset);
  return d.toISOString().slice(0, 10);
}

function formatNavDate(offset) {
  if (offset === 0) return 'Today';
  if (offset === -1) return 'Yesterday';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function updateDateNav() {
  document.getElementById('dateNavLabel').textContent = formatNavDate(dateOffset);
  document.getElementById('nextDay').classList.toggle('invisible', dateOffset >= 0);
}

function getLog() {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return all[getDateKey()] || [];
}

function saveLog(log) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  all[getDateKey()] = log;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'flex';
}

// ── Frequent foods ──
function getFrequentFoods(limit = 8) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const map = {};
  Object.values(all).forEach(dayLog => {
    if (!Array.isArray(dayLog)) return;
    dayLog.forEach(item => {
      if (!item.name) return;
      const key = item.name.toLowerCase();
      if (!map[key]) map[key] = { ...item, count: 0 };
      map[key].count++;
    });
  });
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, limit);
}

function renderFrequent() {
  const foods = getFrequentFoods();
  const wrap = document.getElementById('frequentWrap');
  const list = document.getElementById('frequentList');
  if (!foods.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  list.innerHTML = foods.map((f, i) => `<button class="freq-chip" data-i="${i}">${f.name}</button>`).join('');
  list.querySelectorAll('.freq-chip').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const f = foods[i];
      const grams = f.grams || 100;
      selectedFood = {
        name:       f.name,
        protein100: f.p100 ?? (f.protein / grams * 100),
        carbs100:   f.c100 ?? (f.carbs   / grams * 100),
        fat100:     f.f100 ?? (f.fat     / grams * 100),
        source:     'Frequent'
      };
      document.getElementById('quickSearch').value = '';
      showFoodDetail();
    });
  });
}

// ── Home ──
function renderHome() {
  const log     = getLog();
  const targets = getTargets();
  let p = 0, c = 0, f = 0;
  log.forEach(item => { p += item.protein; c += item.carbs; f += item.fat; });
  const cal = Math.round(p * 4 + c * 4 + f * 9);

  document.getElementById('barCalories').style.width = Math.min(100, cal / targets.calories * 100) + '%';
  document.getElementById('barProtein').style.width  = Math.min(100, p / targets.protein   * 100) + '%';
  document.getElementById('barCarbs').style.width    = Math.min(100, c / targets.carbs     * 100) + '%';
  document.getElementById('barFat').style.width      = Math.min(100, f / targets.fat       * 100) + '%';
  document.getElementById('valCalories').textContent = `${cal} / ${targets.calories}`;
  document.getElementById('valProtein').textContent  = `${Math.round(p)} / ${targets.protein}g`;
  document.getElementById('valCarbs').textContent    = `${Math.round(c)} / ${targets.carbs}g`;
  document.getElementById('valFat').textContent      = `${Math.round(f)} / ${targets.fat}g`;

  renderFrequent();

  const list = document.getElementById('logList');
  if (!log.length) {
    list.innerHTML = '<div class="empty-log">Nothing logged yet</div>';
    return;
  }

  const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  list.innerHTML = log.map((item, i) => {
    const meal = item.meal || '';
    const mealCls = meal ? `meal-chip ${meal.toLowerCase()}` : 'meal-chip';
    const mealLabel = meal || '+ Meal';
    const pickerBtns = MEALS.map(m =>
      `<button class="meal-pick-btn ${m.toLowerCase()}" data-meal="${m}" data-i="${i}">${m}</button>`
    ).join('') + (meal ? `<button class="meal-pick-btn" data-meal="" data-i="${i}">Clear</button>` : '');
    const qty = item.unit === 'pcs' && item.pieces
      ? `${item.pieces} pcs`
      : (item.grams ? `${item.grams}${item.unit || 'g'}` : '');
    return `
      <div class="log-item">
        <div class="log-item-body" data-i="${i}" style="flex:1;cursor:pointer">
          <div class="log-item-name">${item.name}${qty ? ` — ${qty}` : ''}</div>
          <div class="log-item-macros">P ${Math.round(item.protein)}g · C ${Math.round(item.carbs)}g · F ${Math.round(item.fat)}g</div>
          <span class="${mealCls}" data-i="${i}">${mealLabel}</span>
          <div class="meal-picker hidden" data-picker="${i}">${pickerBtns}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;padding-left:10px">
          <button class="log-item-delete" data-i="${i}">×</button>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="log-item-tomorrow" data-i="${i}" title="Copy to tomorrow">→ tmr</button>
            <button class="log-item-dupe" data-i="${i}" title="Duplicate today">⧉</button>
          </div>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.meal-chip').forEach(chip => {
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const picker = list.querySelector(`[data-picker="${chip.dataset.i}"]`);
      list.querySelectorAll('.meal-picker').forEach(p => { if (p !== picker) p.classList.add('hidden'); });
      picker.classList.toggle('hidden');
    });
  });

  list.querySelectorAll('.meal-pick-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const l = getLog();
      l[+btn.dataset.i].meal = btn.dataset.meal;
      saveLog(l);
      renderHome();
    });
  });

  list.querySelectorAll('.log-item-body').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.meal-chip, .meal-picker, .meal-pick-btn')) return;
      openEditModal(+el.dataset.i);
    });
  });

  list.querySelectorAll('.log-item-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const l = getLog(); l.splice(+btn.dataset.i, 1); saveLog(l); renderHome();
    });
  });

  list.querySelectorAll('.log-item-dupe').forEach(btn => {
    btn.addEventListener('click', () => {
      const l = getLog();
      l.push({ ...l[+btn.dataset.i] });
      saveLog(l); renderHome();
    });
  });

  list.querySelectorAll('.log-item-tomorrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const l = getLog();
      const item = { ...l[+btn.dataset.i] };
      const d = new Date();
      d.setDate(d.getDate() + dateOffset + 1);
      const nextKey = d.toISOString().slice(0, 10);
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!all[nextKey]) all[nextKey] = [];
      all[nextKey].push(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '→'; }, 1000);
    });
  });
}

document.getElementById('prevDay').addEventListener('click', () => {
  dateOffset--;
  updateDateNav();
  renderHome();
});

document.getElementById('nextDay').addEventListener('click', () => {
  if (dateOffset < 0) { dateOffset++; updateDateNav(); renderHome(); }
});

document.addEventListener('click', () => {
  document.querySelectorAll('.meal-picker').forEach(p => p.classList.add('hidden'));
});

// ── Food search (Nutritionix) ──
let searchTimer = null;

document.getElementById('quickSearch').addEventListener('input', e => {
  const q = e.target.value.trim();
  document.getElementById('foodDetail').classList.add('hidden');
  document.getElementById('manualEntry').classList.add('hidden');
  if (q.length < 3) { document.getElementById('searchResults').classList.add('hidden'); return; }
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(q), 400);
});

document.getElementById('quickSearch').addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    e.target.value = '';
    document.getElementById('searchResults').classList.add('hidden');
  }
});

async function runSearch(q) {
  const { nixId, nixKey } = getSettings();
  const resultsEl = document.getElementById('searchResults');

  const manualRow = (label, meta) => `<div class="search-result-item search-result-manual">
    <div class="result-name">${label}</div>
    <div class="result-meta">${meta}</div>
  </div>`;

  if (!nixId || !nixKey) {
    resultsEl.innerHTML = manualRow(`+ Add "${q}" manually`, 'Add Nutritionix keys in Settings for food search');
    resultsEl.classList.remove('hidden');
    resultsEl.querySelector('.search-result-manual').addEventListener('click', () => {
      resultsEl.classList.add('hidden');
      showManualEntry(q);
    });
    return;
  }

  resultsEl.innerHTML = '<div class="search-result-item" style="color:#94a3b8;cursor:default">Searching…</div>';
  resultsEl.classList.remove('hidden');

  try {
    const res  = await fetch(
      `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(q)}&detailed=true`,
      { headers: { 'x-app-id': nixId, 'x-app-key': nixKey } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const common  = (data.common  || []).slice(0, 5);
    const branded = (data.branded || []).slice(0, 3);

    if (!common.length && !branded.length) {
      resultsEl.innerHTML = '<div class="search-result-item" style="color:#94a3b8;cursor:default">No results</div>'
        + manualRow(`+ Add "${q}" manually`, 'Enter macros yourself');
    } else {
      resultsEl.innerHTML =
        common.map((f, i) => `<div class="search-result-item" data-type="common" data-i="${i}">
          <div class="result-name">${f.food_name}</div>
          <div class="result-meta">Generic</div>
        </div>`).join('') +
        branded.map((f, i) => `<div class="search-result-item" data-type="branded" data-i="${i}">
          <div class="result-name">${f.food_name}${f.brand_name ? ` · <span style="color:#94a3b8;font-weight:400">${f.brand_name}</span>` : ''}</div>
          <div class="result-meta">${f.serving_qty || 1} ${f.serving_unit || 'serving'}${f.nf_calories ? ` · ${Math.round(f.nf_calories)} kcal` : ''}</div>
        </div>`).join('') +
        manualRow(`+ Add "${q}" manually`, 'Enter macros yourself');
    }

    resultsEl.querySelectorAll('[data-type="common"]').forEach(el => {
      el.addEventListener('click', async () => {
        const food = common[+el.dataset.i];
        resultsEl.innerHTML = '<div class="search-result-item" style="color:#94a3b8;cursor:default">Loading…</div>';
        try {
          const r2  = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
            method:  'POST',
            headers: { 'x-app-id': nixId, 'x-app-key': nixKey, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query: `100g ${food.food_name}` })
          });
          const d2   = await r2.json();
          const item = d2.foods?.[0];
          if (!item) throw new Error('no data');
          const w = item.serving_weight_grams || 100;
          selectedFood = {
            name:       item.food_name,
            protein100: (item.nf_protein            || 0) * 100 / w,
            carbs100:   (item.nf_total_carbohydrate || 0) * 100 / w,
            fat100:     (item.nf_total_fat          || 0) * 100 / w,
            source:     'Nutritionix'
          };
          resultsEl.classList.add('hidden');
          document.getElementById('quickSearch').value = '';
          showFoodDetail();
        } catch { resultsEl.classList.add('hidden'); showManualEntry(food.food_name); }
      });
    });

    resultsEl.querySelectorAll('[data-type="branded"]').forEach(el => {
      el.addEventListener('click', () => {
        const food = branded[+el.dataset.i];
        const w = food.serving_weight_grams || 100;
        selectedFood = {
          name:       food.brand_name ? `${food.food_name} (${food.brand_name})` : food.food_name,
          protein100: (food.nf_protein            || 0) * 100 / w,
          carbs100:   (food.nf_total_carbohydrate || 0) * 100 / w,
          fat100:     (food.nf_total_fat          || 0) * 100 / w,
          source:     food.brand_name || 'Nutritionix'
        };
        resultsEl.classList.add('hidden');
        document.getElementById('quickSearch').value = '';
        showFoodDetail();
      });
    });

    resultsEl.querySelector('.search-result-manual').addEventListener('click', () => {
      resultsEl.classList.add('hidden');
      showManualEntry(q);
    });

  } catch(e) {
    resultsEl.innerHTML = '<div class="search-result-item" style="color:#94a3b8;cursor:default">Search failed — check keys in Settings</div>';
  }
}

function showManualEntry(name) {
  document.getElementById('manualName').value = name;
  document.getElementById('manualP').value    = '';
  document.getElementById('manualC').value    = '';
  document.getElementById('manualF').value    = '';
  document.getElementById('foodDetail').classList.add('hidden');
  document.getElementById('manualEntry').classList.remove('hidden');
}

document.getElementById('manualAddBtn').addEventListener('click', () => {
  const name = document.getElementById('manualName').value.trim() || 'Custom food';
  const p = parseFloat(document.getElementById('manualP').value) || 0;
  const c = parseFloat(document.getElementById('manualC').value) || 0;
  const f = parseFloat(document.getElementById('manualF').value) || 0;
  selectedFood = { name, protein100: p, carbs100: c, fat100: f, source: 'Manual entry' };
  document.getElementById('manualEntry').classList.add('hidden');
  showFoodDetail();
});

function showFoodDetail(fromEdit = false) {
  if (!fromEdit) {
    editingIndex = null;
    document.getElementById('addFoodBtn').textContent = 'Add to Log';
    setPanelUnit('g');
    document.getElementById('perPieceWrap').style.display = 'none';
  }
  const detail = document.getElementById('foodDetail');
  detail.classList.remove('hidden');
  document.getElementById('detailName').textContent   = selectedFood.name;
  document.getElementById('detailSource').textContent = selectedFood.source;
  document.getElementById('gramInput').value          = 100;
  updateDetailMacros();
}

function setPanelUnit(unit) {
  selectedUnit = unit;
  document.getElementById('unitG').classList.toggle('selected', unit === 'g');
  document.getElementById('unitMl').classList.toggle('selected', unit === 'ml');
  document.getElementById('unitPcs').classList.toggle('selected', unit === 'pcs');
  document.getElementById('perPieceWrap').style.display = unit === 'pcs' ? 'flex' : 'none';
  document.getElementById('pcsPresets').style.display   = unit === 'pcs' ? 'flex' : 'none';
  document.querySelectorAll('#pcsPresets .pcs-preset').forEach(b => b.classList.remove('active'));
  updateDetailMacros();
}
document.getElementById('unitG').addEventListener('click', () => setPanelUnit('g'));
document.getElementById('unitMl').addEventListener('click', () => setPanelUnit('ml'));
document.getElementById('unitPcs').addEventListener('click', () => setPanelUnit('pcs'));

document.querySelectorAll('#pcsPresets .pcs-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('perPieceInput').value = btn.dataset.g;
    document.querySelectorAll('#pcsPresets .pcs-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateDetailMacros();
  });
});

document.getElementById('gramInput').addEventListener('input', updateDetailMacros);
document.getElementById('perPieceInput').addEventListener('input', updateDetailMacros);

function updateDetailMacros() {
  if (!selectedFood) return;
  let g;
  if (selectedUnit === 'pcs') {
    const pieces   = parseFloat(document.getElementById('gramInput').value)    || 0;
    const perPiece = parseFloat(document.getElementById('perPieceInput').value) || 0;
    g = pieces * perPiece;
  } else {
    g = parseFloat(document.getElementById('gramInput').value) || 0;
  }
  const r = g / 100;
  document.getElementById('detailProtein').textContent = Math.round(selectedFood.protein100 * r * 10) / 10 + 'g';
  document.getElementById('detailCarbs').textContent   = Math.round(selectedFood.carbs100   * r * 10) / 10 + 'g';
  document.getElementById('detailFat').textContent     = Math.round(selectedFood.fat100     * r * 10) / 10 + 'g';
}

document.getElementById('addFoodBtn').addEventListener('click', () => {
  let g, pieces, perPiece;
  if (selectedUnit === 'pcs') {
    pieces   = parseFloat(document.getElementById('gramInput').value)    || 1;
    perPiece = parseFloat(document.getElementById('perPieceInput').value) || 100;
    g = pieces * perPiece;
  } else {
    g = parseFloat(document.getElementById('gramInput').value) || 100;
  }
  const r   = g / 100;
  const log = getLog();
  const entry = {
    name:    selectedFood.name,
    grams:   g,
    unit:    selectedUnit,
    protein: selectedFood.protein100 * r,
    carbs:   selectedFood.carbs100   * r,
    fat:     selectedFood.fat100     * r,
    p100:    selectedFood.protein100,
    c100:    selectedFood.carbs100,
    f100:    selectedFood.fat100,
    ...(selectedUnit === 'pcs' && { pieces, perPiece }),
  };

  if (editingIndex !== null) {
    entry.meal   = log[editingIndex].meal;  // preserve meal label
    log[editingIndex] = entry;
    editingIndex = null;
  } else {
    log.push(entry);
  }

  saveLog(log);
  selectedFood = null;
  document.getElementById('foodDetail').classList.add('hidden');
  document.getElementById('addFoodBtn').textContent = 'Add to Log';
  document.getElementById('quickSearch').value = '';
  renderHome();
});

// ── Edit modal ──
let modalUnit = 'g';
let modalFood = null;

function updateModalMacros() {
  if (!modalFood) return;
  let g;
  if (modalUnit === 'pcs') {
    const pieces   = parseFloat(document.getElementById('modalGrams').value)   || 0;
    const perPiece = parseFloat(document.getElementById('modalPerPiece').value) || 0;
    g = pieces * perPiece;
  } else {
    g = parseFloat(document.getElementById('modalGrams').value) || 0;
  }
  const r = g / 100;
  document.getElementById('modalProtein').textContent = Math.round(modalFood.protein100 * r * 10) / 10 + 'g';
  document.getElementById('modalCarbs').textContent   = Math.round(modalFood.carbs100   * r * 10) / 10 + 'g';
  document.getElementById('modalFat').textContent     = Math.round(modalFood.fat100     * r * 10) / 10 + 'g';
}

function openEditModal(i) {
  const item = getLog()[i];
  const g    = item.grams || 100;
  editingIndex = i;
  modalFood = {
    protein100: item.p100 ?? (item.protein / g * 100),
    carbs100:   item.c100 ?? (item.carbs   / g * 100),
    fat100:     item.f100 ?? (item.fat     / g * 100),
  };
  document.getElementById('modalFoodName').textContent = item.name;
  setModalUnit(item.unit || 'g');
  if (item.unit === 'pcs' && item.pieces) {
    document.getElementById('modalGrams').value    = item.pieces;
    document.getElementById('modalPerPiece').value = item.perPiece || 55;
    document.querySelectorAll('#modalPcsPresets .pcs-preset').forEach(b => {
      b.classList.toggle('active', +b.dataset.g === item.perPiece);
    });
  } else {
    document.getElementById('modalGrams').value = g;
  }
  updateModalMacros();
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  editingIndex = null;
  modalFood = null;
}

document.getElementById('modalGrams').addEventListener('input', updateModalMacros);
document.getElementById('modalPerPiece').addEventListener('input', updateModalMacros);

function setModalUnit(unit) {
  modalUnit = unit;
  document.getElementById('modalUnitG').classList.toggle('selected', unit === 'g');
  document.getElementById('modalUnitMl').classList.toggle('selected', unit === 'ml');
  document.getElementById('modalUnitPcs').classList.toggle('selected', unit === 'pcs');
  document.getElementById('modalPerPieceWrap').style.display   = unit === 'pcs' ? 'flex' : 'none';
  document.getElementById('modalPcsPresets').style.display     = unit === 'pcs' ? 'flex' : 'none';
  document.querySelectorAll('#modalPcsPresets .pcs-preset').forEach(b => b.classList.remove('active'));
  updateModalMacros();
}
document.getElementById('modalUnitG').addEventListener('click', () => setModalUnit('g'));
document.getElementById('modalUnitMl').addEventListener('click', () => setModalUnit('ml'));
document.getElementById('modalUnitPcs').addEventListener('click', () => setModalUnit('pcs'));

document.querySelectorAll('#modalPcsPresets .pcs-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('modalPerPiece').value = btn.dataset.g;
    document.querySelectorAll('#modalPcsPresets .pcs-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateModalMacros();
  });
});

document.getElementById('modalCancel').addEventListener('click', closeEditModal);

document.getElementById('editModal').addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeEditModal();
});

document.getElementById('modalSave').addEventListener('click', () => {
  if (editingIndex === null || !modalFood) return;
  let g, pieces, perPiece;
  if (modalUnit === 'pcs') {
    pieces   = parseFloat(document.getElementById('modalGrams').value)   || 1;
    perPiece = parseFloat(document.getElementById('modalPerPiece').value) || 100;
    g = pieces * perPiece;
  } else {
    g = parseFloat(document.getElementById('modalGrams').value) || 100;
  }
  const r    = g / 100;
  const log  = getLog();
  const prev = log[editingIndex];
  log[editingIndex] = {
    name:    prev.name,
    grams:   g,
    unit:    modalUnit,
    protein: modalFood.protein100 * r,
    carbs:   modalFood.carbs100   * r,
    fat:     modalFood.fat100     * r,
    p100:    modalFood.protein100,
    c100:    modalFood.carbs100,
    f100:    modalFood.fat100,
    meal:    prev.meal,
    ...(modalUnit === 'pcs' && { pieces, perPiece }),
  };
  saveLog(log);
  closeEditModal();
  renderHome();
});

// ── Barcode ──
document.getElementById('openBarcode').addEventListener('click', () => { showScreen('barcodeScreen'); startScanner(); });
document.getElementById('barcodeBack').addEventListener('click', () => { stopScanner(); showScreen('homeScreen'); });

function startScanner() {
  const status = document.getElementById('barcodeStatus');
  scanner = new Html5Qrcode('reader');
  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 260, height: 120 } },
    async barcode => {
      stopScanner();
      status.textContent = 'Looking up product…';
      try {
        const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await res.json();
        if (data.status !== 1) { status.textContent = 'Product not found in database'; return; }
        const n = data.product.nutriments;
        selectedFood = { name: data.product.product_name || 'Unknown product', protein100: n['proteins_100g'] || 0, carbs100: n['carbohydrates_100g'] || 0, fat100: n['fat_100g'] || 0, source: 'Open Food Facts' };
        stopScanner();
        showScreen('homeScreen');
        showFoodDetail();
      } catch(e) { status.textContent = 'Lookup failed'; }
    },
    () => {}
  ).catch(() => { status.textContent = 'Camera access denied — allow camera permission'; });
}

function stopScanner() {
  if (scanner) { scanner.stop().catch(() => {}); scanner = null; }
}

// ── Analyse ──
document.getElementById('analyseBtn').addEventListener('click', async () => {
  const { apiKey } = getSettings();
  if (!apiKey) { alert('Add your Claude API key in Settings first.'); return; }
  const log = getLog();
  if (!log.length) { alert('Log some food first.'); return; }

  const resultEl = document.getElementById('aiAnalysisResult');
  resultEl.className = 'ai-result loading';
  resultEl.textContent = 'Analysing your day…';
  resultEl.classList.remove('hidden');

  const targets = getTargets();
  let p = 0, c = 0, f = 0;
  log.forEach(i => { p += i.protein; c += i.carbs; f += i.fat; });
  const cal = Math.round(p * 4 + c * 4 + f * 9);
  const logText = log.map(i => `- ${i.name}${i.grams ? ` (${i.grams}g)` : ''}: P${Math.round(i.protein)}g C${Math.round(i.carbs)}g F${Math.round(i.fat)}g`).join('\n');
  const prompt = `You are a nutrition coach. The user has logged today:\n${logText}\n\nTotals: ${Math.round(p)}g protein, ${Math.round(c)}g carbs, ${Math.round(f)}g fat (${cal} kcal)\nDaily targets: ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat\n\nGive 2-3 short, specific, practical pieces of feedback. Be direct. Under 120 words.`;

  try {
    resultEl.className = 'ai-result';
    resultEl.textContent = await callClaude(apiKey, prompt);
  } catch(e) {
    resultEl.className = 'ai-result error';
    resultEl.textContent = 'Error: ' + e.message;
  }
});

// ── Fridge ──
document.getElementById('openFridge').addEventListener('click', () => showScreen('fridgeScreen'));
document.getElementById('fridgeBack').addEventListener('click', () => { showScreen('homeScreen'); renderHome(); });

document.getElementById('suggestBtn').addEventListener('click', async () => {
  const { apiKey } = getSettings();
  if (!apiKey) { alert('Add your Claude API key in Settings first.'); return; }
  const ingredients = document.getElementById('fridgeInput').value.trim();
  if (!ingredients) { alert('Enter some ingredients first.'); return; }

  const resultEl = document.getElementById('fridgeResult');
  resultEl.className = 'ai-result loading';
  resultEl.textContent = 'Thinking up meals…';
  resultEl.classList.remove('hidden');

  const targets = getTargets();
  const log = getLog();
  let p = 0, c = 0, f = 0;
  log.forEach(i => { p += i.protein; c += i.carbs; f += i.fat; });
  const remP = Math.max(0, targets.protein - Math.round(p));
  const remC = Math.max(0, targets.carbs   - Math.round(c));
  const remF = Math.max(0, targets.fat     - Math.round(f));

  const prompt = `You are a nutrition coach. The user has these ingredients:\n${ingredients}\n\nRemaining daily targets: ${remP}g protein, ${remC}g carbs, ${remF}g fat\n\nSuggest 2-3 simple meal ideas using these ingredients that help hit the remaining targets. For each: name, key ingredients, rough macros (P/C/F in grams). Concise, under 180 words.`;

  try {
    resultEl.className = 'ai-result';
    resultEl.textContent = await callClaude(apiKey, prompt);
  } catch(e) {
    resultEl.className = 'ai-result error';
    resultEl.textContent = 'Error: ' + e.message;
  }
});

// ── Label scan ──
document.getElementById('openLabelScan').addEventListener('click', () => {
  const { apiKey } = getSettings();
  if (!apiKey) { alert('Add your Claude API key in Settings first.'); return; }
  document.getElementById('labelPhoto').click();
});

document.getElementById('labelPhoto').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  const { apiKey } = getSettings();
  if (!apiKey) { alert('Add your Claude API key in Settings first.'); return; }

  showScreen('homeScreen');
  document.getElementById('quickSearch').value = '';
  document.getElementById('foodDetail').classList.add('hidden');
  document.getElementById('manualEntry').classList.add('hidden');

  const statusEl = document.createElement('div');
  statusEl.className = 'ai-result loading';
  statusEl.style.cssText = 'width:100%;max-width:380px;margin-top:16px';
  statusEl.textContent = 'Reading label…';
  document.getElementById('homeScreen').appendChild(statusEl);

  try {
    let base64 = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

    // Use the actual file's MIME type; canvas resize always outputs JPEG
    let mediaType = file.type || 'image/jpeg';

    if (base64.length > 1_600_000) {
      try {
        base64 = await new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => {
            const max = 1200;
            let w = img.width, h = img.height;
            if (w > max || h > max) {
              if (w > h) { h = Math.round(h * max / w); w = max; }
              else       { w = Math.round(w * max / h); h = max; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            res(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
          };
          img.onerror = rej;
          img.src = URL.createObjectURL(file);
        });
        mediaType = 'image/jpeg';
      } catch (_) { /* send original if resize fails */ }
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'This is a nutrition label. Find the PER 100g column and extract the values. Return ONLY valid JSON, nothing else: {"name":"product name","protein":0,"carbs":0,"fat":0}. Numbers only, no units, no explanation.' }
          ]
        }]
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }

    const data   = await resp.json();
    const text   = data.content[0].text;
    const match  = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse response');
    const parsed = JSON.parse(match[0]);

    statusEl.remove();
    selectedFood = {
      name:       parsed.name     || 'Scanned food',
      protein100: parsed.protein  || 0,
      carbs100:   parsed.carbs    || 0,
      fat100:     parsed.fat      || 0,
      source:     'Scanned label'
    };
    showFoodDetail();
  } catch(err) {
    statusEl.className = 'ai-result error';
    statusEl.style.cssText = 'width:100%;max-width:380px;margin-top:16px';
    statusEl.textContent = 'Could not read label: ' + err.message + '. Try manual entry instead.';
  }
});

// ── Claude API ──
async function callClaude(key, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  return data.content[0].text;
}

// ── Settings ──
function setChip(group, val) {
  document.querySelectorAll(`.settings-chip[data-group="${group}"]`).forEach(c => {
    c.classList.toggle('selected', c.dataset.val === String(val));
  });
}

document.querySelectorAll('.settings-chip').forEach(chip => {
  chip.addEventListener('click', () => setChip(chip.dataset.group, chip.dataset.val));
});

function getChip(group) {
  return document.querySelector(`.settings-chip[data-group="${group}"].selected`)?.dataset.val || null;
}

function calcTargetsFromProfile() {
  const weight   = parseFloat(document.getElementById('profileWeight').value);
  const height   = parseFloat(document.getElementById('profileHeight').value);
  const age      = parseFloat(document.getElementById('profileAge').value);
  const sex      = getChip('sex');
  const activity = parseFloat(getChip('activity') || '1.55');
  const goal     = getChip('goal') || 'maintain';

  if (!weight || !height || !age || !sex) {
    alert('Fill in weight, height, age and sex first.');
    return;
  }

  const bmr  = sex === 'male'
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;
  const tdee = Math.round(bmr * activity);

  let targetCal, proteinPerKg, fatPct;
  if (goal === 'fatloss')     { targetCal = tdee - 450; proteinPerKg = 2.2; fatPct = 0.25; }
  else if (goal === 'muscle') { targetCal = tdee + 350; proteinPerKg = 2.0; fatPct = 0.25; }
  else if (goal === 'recomp') { targetCal = tdee;       proteinPerKg = 2.4; fatPct = 0.30; }
  else                        { targetCal = tdee;       proteinPerKg = 1.8; fatPct = 0.25; }

  const protein = Math.round(weight * proteinPerKg);
  const fat     = Math.round((targetCal * fatPct) / 9);
  const carbs   = Math.max(0, Math.round((targetCal - protein * 4 - fat * 9) / 4));
  const actualCal = protein * 4 + carbs * 4 + fat * 9;

  document.getElementById('targetCalories').value = actualCal;
  document.getElementById('targetProtein').value  = protein;
  document.getElementById('targetCarbs').value    = carbs;
  document.getElementById('targetFat').value      = fat;
}

document.getElementById('calcTargetsBtn').addEventListener('click', calcTargetsFromProfile);

document.getElementById('openSettings').addEventListener('click', () => {
  const s = getSettings();
  document.getElementById('apiKeyInput').value    = s.apiKey  || '';
  document.getElementById('nixAppId').value       = s.nixId   || '';
  document.getElementById('nixAppKey').value      = s.nixKey  || '';
  document.getElementById('targetCalories').value = s.calories || 2000;
  document.getElementById('targetProtein').value  = s.protein  || 150;
  document.getElementById('targetCarbs').value    = s.carbs    || 200;
  document.getElementById('targetFat').value      = s.fat      || 65;
  document.getElementById('profileWeight').value  = s.weight   || '';
  document.getElementById('profileHeight').value  = s.height   || '';
  document.getElementById('profileAge').value     = s.age      || '';
  if (s.sex)            setChip('sex',      s.sex);
  if (s.activity)       setChip('activity', s.activity);
  if (s.goal !== undefined) setChip('goal', s.goal);
  showScreen('settingsScreen');
});

document.getElementById('settingsBack').addEventListener('click', () => { showScreen('homeScreen'); renderHome(); });

document.getElementById('saveSettings').addEventListener('click', () => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    apiKey:   document.getElementById('apiKeyInput').value.trim(),
    nixId:    document.getElementById('nixAppId').value.trim(),
    nixKey:   document.getElementById('nixAppKey').value.trim(),
    calories: +document.getElementById('targetCalories').value || 2000,
    protein:  +document.getElementById('targetProtein').value  || 150,
    carbs:    +document.getElementById('targetCarbs').value    || 200,
    fat:      +document.getElementById('targetFat').value      || 65,
    weight:   +document.getElementById('profileWeight').value  || 0,
    height:   +document.getElementById('profileHeight').value  || 0,
    age:      +document.getElementById('profileAge').value     || 0,
    sex:      getChip('sex')      || '',
    activity: getChip('activity') || '1.55',
    goal:     getChip('goal')     || '0',
  }));
  showScreen('homeScreen');
  renderHome();
});

// ── Init ──
showScreen('homeScreen');
renderHome();
