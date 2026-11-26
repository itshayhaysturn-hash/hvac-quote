let activeTrigger = '';
let unitBatch = [];
let editingIndex = -1;
let lastSystemType = 'HVAC';

function grabMatch(text, regex) {
  const m = text.match(regex);
  return (m && m.length > 1) ? m.at(1).trim() : '';
}

function getUnitTag() {
  const explicitTag = document.getElementById('unitTag')?.value.trim();
  if (explicitTag) return explicitTag.toUpperCase();
  const addr = document.getElementById('addr').value.trim();
  const unitMatch = addr.match(/\b((?:AC|RTU|CU|AHU|EF|MAU|WIC|WIF|REACH|ICE)[\s\-]*\d+)\b/i);
  return unitMatch ? unitMatch.at(1).toUpperCase() : '';
}

function detectRefrigerant() {
  const unitTag = document.getElementById('unitTag')?.value.toUpperCase() || '';
  const desc = document.getElementById('equipDesc').value.toUpperCase();
  const addr = document.getElementById('addr').value.toUpperCase();
  const combined = `${lastSystemType} ${unitTag} ${desc} ${addr}`;
  return /\b(REFR|REFRIGERATION|COOLER|FREEZER|WIC|WIF|REACH)\b/.test(combined) ? 'R404' : 'R410A';
}

function getEmailSubjectPrefix(overrideUnit) {
  const wo = document.getElementById('wo').value.trim();
  const cust = document.getElementById('cust').value.trim();
  const unit = overrideUnit !== undefined
    ? overrideUnit
    : getAllWorkingUnits().map(u => u.label).join(', ');
  return [wo, unit, cust].filter(Boolean).join(' ') || 'HVACR Quote';
}


             
async function smartPaste() {
  const status = document.getElementById('paste-status');
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) { status.textContent = 'Clipboard is empty.'; return; }
    parseText(text);
  } catch (err) {
    status.textContent = 'Click inside the box below and press Ctrl+V.';
    document.getElementById('manual-paste').focus();
  }
}

function autoArchivePreviousUnitIfSwitching(raw) {
  // Don't auto-archive if we're actively editing an existing batch pill
  if (editingIndex >= 0) return false;

  const curUnit = document.getElementById('unitTag')?.value.trim().toUpperCase() || '';
  const curModel = document.getElementById('model')?.value.trim().toUpperCase() || '';
  const curSerial = document.getElementById('serial')?.value.trim().toUpperCase() || '';
  const curBrand = document.getElementById('brand')?.value.trim().toUpperCase() || '';

  const hasExistingUnit = Boolean(curUnit || curModel || curSerial || curBrand);
  if (!hasExistingUnit) return false;

  // Check if current unit already has parts, findings, or labor entered
  const cur = captureCurrentUnit().rawFields || {};
  const hasWorkEntered = Boolean(
    cur.desc || cur.laborNotes ||
    (cur.stockData && cur.stockData.length > 0) ||
    (cur.vendorData && cur.vendorData.length > 0)
  );
  if (!hasWorkEntered) return false;

  // Detect incoming unit identity from the pasted text
  const incomingModel = (grabMatch(raw, /Model[\s:\-#]+([A-Z0-9\-]+)/i) || '').toUpperCase();
  const incomingSerial = (grabMatch(raw, /Serial[\s:\-#]+([A-Z0-9\-]+)/i) || '').toUpperCase();
  const unitLine = raw.split(/\r?\n/).map(l => l.trim()).find(l => /^(AC|RTU|CU|AHU|EF|MAU|WIC|WIF|REACH|ICE)[\s\-]*\d+/i.test(l)) || '';
  const incomingUnit = (grabMatch(unitLine, /^([A-Z]+[\s\-]*\d+)/i) || '').toUpperCase();

  const isDifferentUnit =
    (incomingUnit && curUnit && incomingUnit !== curUnit) ||
    (incomingModel && curModel && incomingModel !== curModel) ||
    (incomingSerial && curSerial && incomingSerial !== curSerial);

  if (isDifferentUnit) {
    const finishedUnit = captureCurrentUnit();
    unitBatch.push(finishedUnit);
    resetUnitFields();
    updateBatchUI();
    return true;
  }
  return false;
}

let manualUnitHintShown = false;

function showManualBatchToast() {
  if (editingIndex >= 0 || manualUnitHintShown) return;
  const cur = captureCurrentUnit().rawFields || {};
  const hasWorkEntered = Boolean(
    cur.desc || cur.laborNotes ||
    (cur.stockData && cur.stockData.length > 0) ||
    (cur.vendorData && cur.vendorData.length > 0)
  );
  if (!hasWorkEntered) return;

  manualUnitHintShown = true;
  let toast = document.getElementById('manual-batch-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'manual-batch-toast';
    toast.style.cssText = 'position:fixed; top:14px; left:50%; transform:translateX(-50%); background:#1e293b; color:#ffca28; border:1px solid #ffca28; padding:10px 16px; border-radius:8px; font-size:14px; font-weight:bold; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.6); max-width:90%; text-align:center;';
    document.body.appendChild(toast);
  }
  toast.textContent = 'If this is a new unit, tap "+ Add Unit to Batch" first!';
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 5000);
}


function parseText(raw) {
  let updated = [];
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  const autoSavedPrev = autoArchivePreviousUnitIfSwitching(raw);
  if (autoSavedPrev) {
    updated.push('Auto-saved previous unit to batch');
  }

  if (/\bREFR(IGERATION)?\b/i.test(raw)) lastSystemType = 'REFR';
  else if (/\bHVAC\b/i.test(raw)) lastSystemType = 'HVAC';

    
  const woVal = grabMatch(raw, /(?:(?:\b|SERVICE|REFR|HVAC|PM|QUOT[A-Z]*)WO|Work\s*Order)\s*#?\s*[:\-]?\s*([0-9][A-Z0-9\-]*)/i);
  const poVal = grabMatch(raw, /(?:Cust(?:omer)?\s*)?PO\s*#?\s*[:\-]?\s*([A-Z0-9\-]+)/i);
  if (woVal) {
    document.getElementById('wo').value = woVal;
    updated.push('WO #');
  }
  if (poVal) {
    document.getElementById('po').value = poVal;
    updated.push('PO #');
  }

  let newBrand = '';
  const makeVal = grabMatch(raw, /Make[\s:\-]+(.+)/i);
  if (makeVal) newBrand = makeVal.toUpperCase();
  else {
    for (let b of KNOWN_BRANDS) {
      if (new RegExp('\\b' + b + '\\b', 'i').test(raw)) { newBrand = b; break; }
    }
  }

  if (newBrand) {
    document.getElementById('brand').value = newBrand;
    updated.push('Make');
      }

  const modelVal = grabMatch(raw, /Model\s*#?[\s:\-]+([A-Z0-9\-\/]+)/i);
  if (modelVal) { document.getElementById('model').value = modelVal.toUpperCase(); updated.push('Model'); }

  const serialVal = grabMatch(raw, /Serial\s*#?[\s:\-]+([A-Z0-9\-]+)/i);
  if (serialVal) { document.getElementById('serial').value = serialVal.toUpperCase(); updated.push('Serial'); }

  const equipDescVal = grabMatch(raw, /Description[\s:\-]+(.+)/i);
  if (equipDescVal) { document.getElementById('equipDesc').value = equipDescVal.toUpperCase(); updated.push('Description'); }

  const yearVal = grabMatch(raw, /Year[\s:\-]+(\d{4})/i);
  if (yearVal) { document.getElementById('year').value = yearVal; updated.push('Year'); }

   let unitTag = '';
  const unitLine = lines.find(l => /^(AC|RTU|CU|AHU|EF|MAU|WIC|WIF|REACH|ICE)[\s\-]*\d+/i.test(l));
  if (unitLine) unitTag = grabMatch(unitLine, /^([A-Z]+[\s\-]*\d+)/i).toUpperCase();
  const serviceArea = grabMatch(raw, /Service\s*Area[\s:\-]+(.+)/i);

  if (unitTag) {
    const unitEl = document.getElementById('unitTag');
    if (unitEl) unitEl.value = unitTag;
    updated.push('Unit #');
  }

  if (serviceArea) {
    const currentAddr = document.getElementById('addr').value.trim();
    const baseAddr = currentAddr.replace(/\s*\([^)]*\)\s*$/, '').trim();
    document.getElementById('addr').value = baseAddr ? `${baseAddr} (${serviceArea})` : serviceArea;
    updated.push('Service Area');
  }

  if (woVal || poVal || /Service Type:/i.test(raw)) {
    const streetIdx = lines.findIndex(l => /^\d+\s+[A-Z0-9\s\.]+(?:BLVD|BOULEVARD|ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|HWY|PKWY|LN|LANE|WAY|CT)/i.test(l));
    if (streetIdx > 0) {
      document.getElementById('cust').value = lines.at(streetIdx - 1);
      updated.push('Customer');
      const street = lines.at(streetIdx);
      const nextLine = lines.at(streetIdx + 1) || '';
      const cityStateZip = !nextLine.includes(':') ? nextLine : '';
      const fullAddr = [street, cityStateZip].filter(Boolean).join(', ');
      const existingTag = document.getElementById('addr').value.trim();
      document.getElementById('addr').value = (existingTag && !existingTag.includes(street)) ? `${fullAddr} (${existingTag})` : fullAddr;
      updated.push('Address');
    }
  }

  document.getElementById('paste-status').textContent = updated.length ? 'Filled: ' + updated.join(', ') : 'Checked text (no matching fields found).';
  updateBatchUI();
  saveSessionState();
}

function clampQty(input) {
  if (input.value === '') return;
  const val = parseFloat(input.value);
  if (isNaN(val) || val < 1) {
    input.value = '1';
    saveSessionState();
  }
}

function formatStockDisplay(codeOrFull) {
  const raw = (codeOrFull || '').trim();
  if (!raw) return '';
  if (raw.includes(' - ')) return raw;
  const upper = raw.toUpperCase();
  const match = (typeof TRUCK_STOCK_CATALOG !== 'undefined')
    ? TRUCK_STOCK_CATALOG.find(i => i.code === upper)
    : null;
  return match ? `${match.code} - ${match.desc}` : upper;
}

function addStockRow(qty, code) {
  const container = document.getElementById('stock-container');
  // Prevent stacking multiple blank rows at the bottom
  if (!qty && !code && container.lastElementChild) {
    const lastCode = container.lastElementChild.querySelector('.code')?.value.trim();
    if (!lastCode) return;
  }

  const row = document.createElement('div');
  row.className = 'item-row';
  const displayVal = formatStockDisplay(code);
  row.innerHTML = `
    <input type="number" class="qty" placeholder="Qty" min="1" step="1" value="${qty}" inputmode="decimal" onchange="clampQty(this)">
    <input type="text" class="code" placeholder="Search code or part name" value="${displayVal.replace(/"/g, '&quot;')}" oninput="filterStock(this)" onfocus="filterStock(this)">
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">X</button>
    <div class="search-dropdown" style="display:none;"></div>
  `;
  container.appendChild(row);
}





function filterStock(input) {
  const query = input.value.trim().toLowerCase();
  const dropdown = input.parentElement.querySelector('.search-dropdown');
  const matches = TRUCK_STOCK_CATALOG.filter(item =>
    !query || item.code.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query)
  );
  if (matches.length === 0) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = matches.map(m => `
    <div class="search-option" onmousedown="selectStock(this, '${m.code}')">
      <strong>${m.code}</strong> &mdash; ${m.desc}
    </div>
  `).join('');
  dropdown.style.display = 'block';
}

function selectStock(optionEl, code) {
  const row = optionEl.closest('.item-row');
  row.querySelector('.code').value = formatStockDisplay(code);
  row.querySelector('.search-dropdown').style.display = 'none';
  const container = document.getElementById('stock-container');
  if (row === container.lastElementChild) addStockRow('', '');
}


document.addEventListener('click', e => {
  if (!e.target.classList.contains('code')) {
    document.querySelectorAll('.search-dropdown').forEach(d => d.style.display = 'none');
  }
});

let modalSelectedCodes = new Set();
let showAllCategories = false;

function toggleMoreCategories() {
  showAllCategories = !showAllCategories;
  renderCategoryButtons();
}

function renderCategoryButtons() {
  const bar = document.getElementById('stock-category-bar');
  if (!bar || typeof TRUCK_STOCK_CATALOG === 'undefined') return;


  const allCats = [];
  let moreCutoffIndex = -1;

  TRUCK_STOCK_CATALOG.forEach(item => {
    const cat = (item.category || '').trim();
    if (!cat) return;
    if (cat.toUpperCase() === 'MORE') {
      if (moreCutoffIndex === -1) moreCutoffIndex = allCats.length;
    } else if (!allCats.includes(cat)) {
      allCats.push(cat);
    }
  });


  const hasMore = moreCutoffIndex > 0 && moreCutoffIndex < allCats.length;
  const visibleCats = (hasMore && !showAllCategories)
    ? allCats.slice(0, moreCutoffIndex)
    : allCats;

  let html = visibleCats.map(cat =>
    `<button type="button" class="cat-pill" onclick="openStockCategory('${cat}')">${cat}</button>`
  ).join('');

  if (hasMore) {
    const hiddenCount = allCats.length - moreCutoffIndex;
    const toggleLabel = showAllCategories ? 'Less ▲' : `+ More (${hiddenCount}) ▼`;
    html += `<button type="button" class="cat-pill" style="border-color:#ffca28; color:#ffca28;" onclick="toggleMoreCategories()">${toggleLabel}</button>`;
  }

  bar.innerHTML = html;
}

function renderTemplatePills() {
  const bar = document.getElementById('template-pill-bar');
  if (!bar || typeof STOCK_TEMPLATES === 'undefined') return;
  bar.innerHTML = Object.keys(STOCK_TEMPLATES).map(name =>
    `<button type="button" class="cat-pill" style="border-color:#2e7d32; color:#81c784;" onclick="applyStockTemplate('${name}')">+ ${name}</button>`
  ).join('');
}

function applyStockTemplate(templateName) {
  const items = (typeof STOCK_TEMPLATES !== 'undefined') ? STOCK_TEMPLATES[templateName] : null;
  if (!items) return;

  const stockContainer = document.getElementById('stock-container');
  if (stockContainer.lastElementChild && !stockContainer.lastElementChild.querySelector('.code').value.trim()) {
    stockContainer.lastElementChild.remove();
  }

  const existingCodes = new Set(
    [...stockContainer.querySelectorAll('.code')].map(el => el.value.split(' - ').at(0).trim().toUpperCase())
  );

  const autoRefr = detectRefrigerant();
  items.forEach(item => {
    const finalCode = item.code === 'AUTO_REFR' ? autoRefr : item.code;
    if (!existingCodes.has(finalCode.toUpperCase())) {
      addStockRow(item.qty, finalCode);
    }
  });

  addStockRow('', '');
  saveSessionState();
}


function toggleMoreCategories() {
  showAllCategories = !showAllCategories;
  renderCategoryButtons();
}


function getPartIcon(code) {
  const wrap = (inner) => `
    <svg width="46" height="46" viewBox="0 0 46 46" style="flex-shrink:0; background:#14181e; border:1px solid #333; border-radius:6px;">
      ${inner}
    </svg>`;

  // 3/4" Seal Tight Straight Connector
  if (code === '34STC') {
    return wrap(`
      <rect x="6" y="16" width="10" height="14" rx="2" fill="#90a4ae" stroke="#cfd8dc" stroke-width="1"/>
      <rect x="16" y="13" width="8" height="20" rx="1.5" fill="#b0bec5" stroke="#eceff1" stroke-width="1"/>
      <rect x="24" y="15" width="7" height="16" rx="1" fill="#78909c" stroke="#cfd8dc" stroke-width="1"/>
      <rect x="31" y="17" width="9" height="12" rx="1" fill="#b0bec5" stroke="#eceff1" stroke-width="1"/>
      <line x1="34" y1="17" x2="34" y2="29" stroke="#37474f" stroke-width="1.2"/>
      <line x1="37" y1="17" x2="37" y2="29" stroke="#37474f" stroke-width="1.2"/>
    `);
  }

  // 3/4" Seal Tight 90 Connector
  if (code === '34STC90') {
    return wrap(`
      <path d="M12 36 L12 22 Q12 13 21 13 L33 13" fill="none" stroke="#90a4ae" stroke-width="9" stroke-linecap="round"/>
      <rect x="6" y="31" width="12" height="7" rx="1.5" fill="#cfd8dc" stroke="#37474f" stroke-width="1"/>
      <rect x="30" y="8" width="6" height="10" rx="1" fill="#cfd8dc" stroke="#37474f" stroke-width="1"/>
      <rect x="36" y="9" width="5" height="8" rx="1" fill="#b0bec5"/>
    `);
  }

  // 3/4" Seal Tight Flexible Conduit
  if (code === '34ST') {
    return wrap(`
      <path d="M8 35 C12 20, 26 26, 38 11" fill="none" stroke="#78909c" stroke-width="11" stroke-linecap="round"/>
      <path d="M8 35 C12 20, 26 26, 38 11" fill="none" stroke="#cfd8dc" stroke-width="11" stroke-dasharray="2.5 3" stroke-linecap="round"/>
    `);
  }

  // Male/Female Multistack Piggyback (ETMFMST)
  if (code === 'ETMFMST') {
    return wrap(`
      <line x1="4" y1="26" x2="12" y2="26" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <rect x="11" y="20" width="12" height="12" rx="2" fill="#29b6f6" stroke="#fff" stroke-width="1"/>
      <path d="M23 19 L39 19 L39 33 L23 33 Z" fill="#cfd8dc" stroke="#90a4ae" stroke-width="1.2"/>
      <line x1="25" y1="24" x2="38" y2="24" stroke="#37474f" stroke-width="1.5"/>
      <path d="M24 19 L29 9 L38 9 L33 19 Z" fill="#eceff1" stroke="#78909c" stroke-width="1.2"/>
      <circle cx="32" cy="13" r="1.4" fill="#37474f"/>
    `);
  }

  // Female Spade Slide-On Terminals (ETFC1210 & ETFCV1614 = Blue, EFC10 = Yellow)
  if (code === 'ETFC1210' || code === 'ETFCV1614' || code === 'EFC10') {
    const sleeve = code === 'EFC10' ? '#ffca28' : '#29b6f6';
    return wrap(`
      <line x1="5" y1="23" x2="14" y2="23" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <rect x="13" y="17" width="13" height="12" rx="2" fill="${sleeve}" stroke="#fff" stroke-width="1"/>
      <path d="M26 15 L40 15 L40 31 L26 31 Z" fill="#cfd8dc" stroke="#90a4ae" stroke-width="1.2"/>
      <line x1="28" y1="20" x2="39" y2="20" stroke="#37474f" stroke-width="1.5"/>
      <line x1="28" y1="26" x2="39" y2="26" stroke="#37474f" stroke-width="1.5"/>
    `);
  }

  // Fork / Spade Terminals (ETFORK1210, ETFORK1614 = Blue)
  if (code === 'ETFORK1210' || code === 'ETFORK1614') {
    return wrap(`
      <line x1="5" y1="23" x2="13" y2="23" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <rect x="12" y="17" width="12" height="12" rx="2" fill="#29b6f6" stroke="#fff" stroke-width="1"/>
      <path d="M24 15 L39 15 L39 19 L30 19 L30 27 L39 27 L39 31 L24 31 Z" fill="#cfd8dc" stroke="#90a4ae" stroke-width="1.2"/>
    `);
  }

  // Butt Splice Connectors (Red 22-18, Blue 16-14, Yellow 10)
  if (code === 'ETBC2218' || code === 'ETBC1614' || code === 'EBC10') {
    const sleeve = code === 'ETBC2218' ? '#ef5350' : (code === 'ETBC1614' ? '#29b6f6' : '#ffca28');
    return wrap(`
      <line x1="4" y1="23" x2="12" y2="23" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <line x1="34" y1="23" x2="42" y2="23" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <rect x="11" y="16" width="24" height="14" rx="3" fill="${sleeve}" stroke="#fff" stroke-width="1"/>
      <line x1="23" y1="16" x2="23" y2="30" stroke="#263238" stroke-width="2"/>
    `);
  }

  // Closed-End Pigtail Crimp Caps (ETPTC2214 = Blue, ETPTC1810 = Yellow)
  if (code === 'ETPTC2214' || code === 'ETPTC1810') {
    const bandColor = code === 'ETPTC2214' ? '#29b6f6' : '#ffca28';
    return wrap(`
      <path d="M16 26 L16 14 Q16 8 23 8 Q30 8 30 14 L30 26 Z" fill="rgba(207,216,220,0.28)" stroke="#cfd8dc" stroke-width="1.5"/>
      <rect x="18" y="13" width="10" height="8" rx="1" fill="#b0bec5"/>
      <rect x="15" y="23" width="16" height="4" rx="1" fill="${bandColor}"/>
      <line x1="20" y1="27" x2="18" y2="39" stroke="#ef5350" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="26" y1="27" x2="28" y2="39" stroke="#42a5f5" stroke-width="2.5" stroke-linecap="round"/>
    `);
  }

  // Ring Terminals (ETRING1614, ETRING1210 = Blue)
  if (code === 'ETRING1614' || code === 'ETRING1210') {
    return wrap(`
      <line x1="5" y1="23" x2="13" y2="23" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <rect x="12" y="17" width="12" height="12" rx="2" fill="#29b6f6" stroke="#fff" stroke-width="1"/>
      <circle cx="32" cy="23" r="8" fill="#cfd8dc" stroke="#90a4ae" stroke-width="1.2"/>
      <circle cx="32" cy="23" r="3.5" fill="#14181e"/>
    `);
  }

  return '';
}










function openStockCategory(category) {
  modalSelectedCodes.clear();
  document.getElementById('stock-modal-title').textContent = `${category} — Tap to Select`;
  const listEl = document.getElementById('stock-modal-list');
  const items = TRUCK_STOCK_CATALOG.filter(i => i.category === category);

  listEl.innerHTML = items.map(item => {
    if (item.code === 'INFO') {
      return `
        <div style="background:#1c2530; border-left:4px solid #ffca28; padding:10px 12px; border-radius:6px; margin-bottom:8px; font-size:13px; color:#e0e0e0; line-height:1.4;">
          <strong style="color:#ffca28;">TECH NOTE:</strong> ${item.desc}
        </div>
      `;
    }
    return `
      <label class="modal-item">
        <input type="checkbox" value="${item.code}" onchange="toggleModalCode('${item.code}', this.checked)">
        ${getPartIcon(item.code)}
        <div>
          <strong style="color:#4da3ff;">${item.code}</strong><br>
          <span style="font-size:14px; color:#ccc;">${item.desc}</span>
        </div>
      </label>
    `;
  }).join('');

  const addBtn = document.getElementById('btn-add-selected-stock');
  addBtn.style.display = 'block';
  addBtn.onclick = confirmStockModal;
  updateModalCount();
  document.getElementById('stock-modal').style.display = 'flex';
}



function toggleModalCode(code, isChecked) {
  if (isChecked) modalSelectedCodes.add(code);
  else modalSelectedCodes.delete(code);
  updateModalCount();
}

function updateModalCount() {
  document.getElementById('btn-add-selected-stock').textContent = `Add Selected (${modalSelectedCodes.size})`;
}

function closeStockModal() {
  document.getElementById('stock-modal').style.display = 'none';
}

function confirmStockModal() {
  const container = document.getElementById('stock-container');
  // Remove trailing blank placeholder row before adding picked items
  if (container.lastElementChild && !container.lastElementChild.querySelector('.code').value.trim()) {
    container.lastElementChild.remove();
  }
  modalSelectedCodes.forEach(code => addStockRow('1', code));
  addStockRow('', '');
  closeStockModal();
  saveSessionState();
}

function addVendorRow(qty, desc, part, price, vendor) {
  const defaultVendor = vendor || document.getElementById('brand').value.trim().toUpperCase();
  const container = document.getElementById('vendor-parts-container');
  const row = document.createElement('div');
  row.className = 'item-row vendor-row';
  row.innerHTML = `
    <input type="number" class="v-qty" placeholder="Qty" min="1" step="1" value="${qty}" inputmode="decimal" onchange="clampQty(this)">
    <input type="text" class="v-desc" placeholder="Description" value="${desc}">
    <input type="text" class="v-part" placeholder="Part #" value="${part}">
    <input type="text" class="v-price" placeholder="Price $" value="${price}" inputmode="decimal">
    <input type="text" class="v-vendor" placeholder="Tap Vendor" value="${defaultVendor}" readonly style="cursor:pointer; color:#4da3ff; font-weight:bold;" onclick="openRowVendorPicker(this)">
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">X</button>
  `;
  container.appendChild(row);
}

function openRowVendorPicker(inputEl) {
  const emailVendors = (typeof EMAIL_DIRECTORY !== 'undefined')
    ? Object.keys(EMAIL_DIRECTORY).filter(k => k !== 'OFFICE')
    : [];
  const localStores = ['HOME DEPOT', 'GRAINGER', 'JOHNSTONE', 'LOWES'];
  const allChoices = [...new Set([...emailVendors, ...localStores])];

  document.getElementById('stock-modal-title').textContent = 'Select Vendor / Store';
  const listEl = document.getElementById('stock-modal-list');
  const addBtn = document.getElementById('btn-add-selected-stock');
  addBtn.style.display = 'none';

  listEl.innerHTML = allChoices.map(v => {
    const isEmailVendor = emailVendors.includes(v);
    const badge = isEmailVendor ? 'Email Vendor' : 'Local Store (Office Email Only)';
    return `
      <button type="button" class="modal-item" style="color:#fff; font-size:16px; text-align:left; width:100%;" data-vendor="${v}">
        <div>
          <strong style="color:#4da3ff;">${v}</strong><br>
          <span style="font-size:12px; color:#aaa;">${badge}</span>
        </div>
      </button>
    `;
  }).join('') + `
    <button type="button" class="modal-item" style="color:#fff; font-size:16px; text-align:left; width:100%;" data-vendor="__CUSTOM__">
      <div>
        <strong style="color:#ffd54f;">Type Custom Vendor...</strong><br>
        <span style="font-size:12px; color:#aaa;">Enter any other supply house or store</span>
      </div>
    </button>
  `;

  listEl.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      const chosen = btn.dataset.vendor;
      addBtn.style.display = 'block';
      closeStockModal();
      if (chosen === '__CUSTOM__') {
        inputEl.removeAttribute('readonly');
        inputEl.style.color = '#fff';
        inputEl.value = '';
        inputEl.focus();
      } else {
        inputEl.setAttribute('readonly', true);
        inputEl.style.color = '#4da3ff';
        inputEl.value = chosen;
      }
      saveSessionState();
    };
  });

  document.getElementById('stock-modal').style.display = 'flex';
}

let triggeredVendorKeywords = new Set();

function checkKeywords() {
  if (typeof VENDOR_KEYWORD_RULES === 'undefined') return;
  const text = document.getElementById('desc').value.toLowerCase();

  for (const [keyword, partsList] of Object.entries(VENDOR_KEYWORD_RULES)) {
    if (text.includes(keyword)) {
      if (!triggeredVendorKeywords.has(keyword)) {
        triggeredVendorKeywords.add(keyword);

        const vendorContainer = document.getElementById('vendor-parts-container');
        const existingDescs = new Set(
          [...vendorContainer.querySelectorAll('.v-desc')].map(el => el.value.trim().toUpperCase())
        );

        partsList.forEach(vp => {
          const upperDesc = (vp.desc || '').toUpperCase();
          if (!upperDesc || !existingDescs.has(upperDesc)) {
            addVendorRow(vp.qty, vp.desc || '', vp.part || '', '', '');
          }
        });
        saveSessionState();
      }
    } else {
      // Reset if tech deletes the phrase so re-typing it later works again
      triggeredVendorKeywords.delete(keyword);
    }
  }
}




   
function captureCurrentUnit() {
  const unit = getUnitTag() || 'Unit';
  const unitTagRaw = document.getElementById('unitTag')?.value.trim() || '';
  const brand = document.getElementById('brand')?.value.trim().toUpperCase() || 'GENERAL';
  const year = document.getElementById('year')?.value.trim() || '';
  const equipDesc = document.getElementById('equipDesc')?.value.trim().toUpperCase() || '';
  const model = document.getElementById('model')?.value.trim().toUpperCase() || '';
  const serial = document.getElementById('serial')?.value.trim().toUpperCase() || '';
  const desc = document.getElementById('desc')?.value.trim() || '';
  const laborNotes = document.getElementById('laborNotes')?.value.trim() || '';

  const addrRaw = document.getElementById('addr')?.value.trim() || '';
  const areaMatch = addrRaw.match(/\(([^)]+)\)\s*$/);
  const serviceArea = areaMatch ? areaMatch.at(1).trim() : '';

      const stockRows = document.querySelectorAll('#stock-container .item-row');
  let stockData = [], officePartLines = [], smPlusLines = [];
  stockRows.forEach(row => {
    const rawQty = row.querySelector('.qty').value.trim();
    const rawText = row.querySelector('.code').value.trim();
    if (rawText) {
      const code = rawText.split(' - ').at(0).trim().toUpperCase();
      const fullDisplay = formatStockDisplay(rawText);
      const numQty = parseFloat(rawQty);
      const dQty = (!isNaN(numQty) && numQty >= 1) ? String(numQty) : '1';

      stockData.push({ qty: dQty, code: fullDisplay });
      officePartLines.push(`🟢 ${dQty}--${fullDisplay}`);
      smPlusLines.push(`${code}\t${dQty}`);
    }
  });

  const vendorRows = document.querySelectorAll('#vendor-parts-container .vendor-row');
  let vendorData = [], vendorPartLines = [];
  vendorRows.forEach(row => {
    const rawQty = row.querySelector('.v-qty').value.trim();
    const vDesc = row.querySelector('.v-desc').value.trim();
    const part = row.querySelector('.v-part').value.trim().toUpperCase();
    const price = row.querySelector('.v-price').value.trim();
    const vendor = row.querySelector('.v-vendor').value.trim();
    if (vDesc || part) {
      const numVQty = parseFloat(rawQty);
      const vQty = (!isNaN(numVQty) && numVQty >= 1) ? String(numVQty) : '1';
      vendorData.push({ qty: vQty, desc: vDesc, part, price, vendor });

      const partLabel = [vDesc, part ? `P/N: ${part}` : ''].filter(Boolean).join(' ');
      vendorPartLines.push(`${vQty}--${partLabel}`);

      const vendorTag = vendor ? ` from ${vendor}` : (brand !== 'GENERAL' ? ` from ${brand}` : '');
      const priceTag = price ? ` $${price.replace(/^\$/, '')}` : '';
      officePartLines.push(`🔴 ${vQty}--${partLabel}${vendorTag}${priceTag}`);
    }
  });


  const vendorSpecLines = [
    unit,
    `Make: ${brand}`,
    model ? `Model: ${model}` : '',
    serial ? `Serial #: ${serial}` : '',
    equipDesc ? `Description: ${equipDesc}` : '',
    serviceArea ? `Service Area: ${serviceArea}` : '',
    year ? `Year: ${year}` : ''
  ].filter(Boolean).join('\n');

  const vendorText = [
    `${unit}:`,
    vendorPartLines.length ? vendorPartLines.join('\n') : '1--(Specify part needed)',
    ``,
    vendorSpecLines
  ].join('\n');

    const officeHeader = desc ? `${unit}: ${desc}` : `${unit}:`;
  const officeText = [
    officeHeader,
    officePartLines.join('\n'),
    laborNotes ? `\n🟡 ${laborNotes}` : ''
  ].filter(Boolean).join('\n');


  return {
    label: unit,
    brand,
    rawFields: {
      unitTag: unitTagRaw,
      brand: document.getElementById('brand')?.value.trim() || '',
      year,
      equipDesc,
      model,
      serial,
      desc,
      laborNotes,
      stockData,
      vendorData
    },
    vendorText,
    officeText,
    smPlusLines
  };
}




function resetUnitFields() {
  const addr = document.getElementById('addr').value.trim();
  const baseAddr = addr.replace(/\s*\([^)]*\)\s*$/, '').trim();
  document.getElementById('addr').value = /^(AC|RTU|CU|AHU|EF|MAU|WIC|WIF|REACH|ICE)[\s\-]*\d+/i.test(baseAddr) ? '' : baseAddr;
  ['unitTag', 'brand', 'year', 'equipDesc', 'model', 'serial', 'desc', 'laborNotes'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.value = '';
});

  document.getElementById('stock-container').innerHTML = '';
  document.getElementById('vendor-parts-container').innerHTML = '';
  activeTrigger = '';
  triggeredVendorKeywords.clear();
  manualUnitHintShown = false;
  addStockRow('', '');
}

function saveUnitToBatch() {
  const unitData = captureCurrentUnit();
  if (editingIndex >= 0) { unitBatch[editingIndex] = unitData; editingIndex = -1; }
  else { unitBatch.push(unitData); }
  resetUnitFields();
  updateBatchUI();
  saveSessionState();
}

function recallBatchUnit(idx) {
  const u = unitBatch[idx];
  if (!u) return;
  editingIndex = idx;
  const f = u.rawFields;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('unitTag', f.unitTag || (u.label !== 'Unit' ? u.label : ''));
  setVal('brand', f.brand);
  setVal('prefer', f.prefer);
  setVal('year', f.year);
  setVal('equipDesc', f.equipDesc);
  setVal('model', f.model);
  setVal('serial', f.serial);
  setVal('desc', f.desc);
  setVal('laborNotes', f.laborNotes);
  document.getElementById('stock-container').innerHTML = '';
  (f.stockData && f.stockData.length ? f.stockData : [{ qty: '', code: '' }]).forEach(s => addStockRow(s.qty, s.code));

  document.getElementById('vendor-parts-container').innerHTML = '';
  (f.vendorData || []).forEach(v => addVendorRow(v.qty, v.desc || '', v.part || '', v.price || '', v.vendor || ''));
  updateBatchUI();
}

function removeBatchUnit(idx, event) {
  if (event) event.stopPropagation();
  const removed = unitBatch[idx];
  if (!removed) return;
  if (!confirm(`Remove ${removed.label} from batch?`)) return;

  unitBatch.splice(idx, 1);
  if (editingIndex === idx) {
    editingIndex = -1;
    resetUnitFields();
  } else if (editingIndex > idx) {
    editingIndex--;
  }
  updateBatchUI();
  saveSessionState();
}

function clearBatch() {
  if (unitBatch.length === 0) return;
  if (!confirm(`Clear all ${unitBatch.length} units from the batch?`)) return;
  unitBatch = [];
  editingIndex = -1;
  updateBatchUI();
  saveSessionState();
}

function updateBatchUI() {
  const statusEl = document.getElementById('batch-status');
  const actionBtn = document.getElementById('btn-batch-action');
  const clearBtn = document.getElementById('btn-clear-batch');
  const pillsEl = document.getElementById('batch-pills');
  const officeBtn = document.getElementById('btn-email-office');

  if (actionBtn) {
    actionBtn.textContent = editingIndex >= 0 ? `Update ${unitBatch[editingIndex].label} in Batch` : '+ Add Unit to Batch';
  }
  if (clearBtn) {
    clearBtn.textContent = editingIndex >= 0 ? `Remove ${unitBatch[editingIndex].label}` : 'Clear All';
    clearBtn.onclick = editingIndex >= 0 ? () => removeBatchUnit(editingIndex) : clearBatch;
  }

  if (pillsEl) {
    pillsEl.innerHTML = unitBatch.map((u, i) => `
      <div class="batch-pill ${i === editingIndex ? 'editing' : ''}" onclick="recallBatchUnit(${i})">
        <span>${u.label} (${u.brand})</span>
        <span class="pill-del" title="Remove unit" onclick="removeBatchUnit(${i}, event)">&times;</span>
      </div>
    `).join('');
  }

  if (statusEl) {
    statusEl.textContent = unitBatch.length === 0
      ? 'Batch: 0 units (will send current unit)'
      : `Tap a unit pill to edit, or tap × to remove (${unitBatch.length} batched):`;
  }
  if (officeBtn) {
    officeBtn.textContent = unitBatch.length > 0 ? `Email Quote to Office (${unitBatch.length} Units)` : 'Email Quote to Office';
  }
}



function copyTextSafe(text) {
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(() => {});
}
function launchEmail(subject, body, toAddress = '', ccAddress = '') {
  const outBox = document.getElementById('output');
  outBox.value = `To: ${toAddress || '(Select in Mail)'}${ccAddress ? '\nCc: ' + ccAddress : ''}\nSubject: ${subject}\n\n${body}`;
  outBox.style.display = 'block';
  copyTextSafe(body);

  const crlfBody = body.replace(/\r?\n/g, '\r\n');
  let params = [`subject=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(crlfBody)}`];
  if (ccAddress) params.unshift(`cc=${encodeURIComponent(ccAddress)}`);

  window.location.href = `mailto:${encodeURIComponent(toAddress)}?${params.join('&')}`;
}

function openEmailBranchPicker(title, entries, onPick) {
  document.getElementById('stock-modal-title').textContent = title;
  const listEl = document.getElementById('stock-modal-list');
  const addBtn = document.getElementById('btn-add-selected-stock');
  addBtn.style.display = 'none';

  listEl.innerHTML = entries.map((entry, idx) => `
    <button type="button" class="modal-item" style="color:#fff; font-size:16px; text-align:left; width:100%;" data-idx="${idx}">
      <div>
        <strong style="color:#4da3ff;">${entry.label}</strong><br>
        <span style="font-size:13px; color:#aaa;">${entry.email}</span>
      </div>
    </button>
  `).join('');

  listEl.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      const picked = entries[Number(btn.dataset.idx)];
      addBtn.style.display = 'block';
      closeStockModal();
      onPick(picked.email);
    };
  });

  document.getElementById('stock-modal').style.display = 'flex';
}

function openVendorPicker() {
  if (typeof EMAIL_DIRECTORY === 'undefined') return;
  const vendors = Object.keys(EMAIL_DIRECTORY).filter(k => k !== 'OFFICE');
  document.getElementById('stock-modal-title').textContent = 'Select Vendor to Email';
  const listEl = document.getElementById('stock-modal-list');
  const addBtn = document.getElementById('btn-add-selected-stock');
  addBtn.style.display = 'none';

  listEl.innerHTML = vendors.map(v => {
    const count = EMAIL_DIRECTORY[v].length;
    const sub = count > 1 ? `${count} branches` : EMAIL_DIRECTORY[v].at(0).email;
    return `
      <button type="button" class="modal-item" style="color:#fff; font-size:16px; text-align:left; width:100%;" onclick="sendVendorQuoteEmail('${v}')">
        <div>
          <strong style="color:#4da3ff;">${v}</strong><br>
          <span style="font-size:13px; color:#aaa;">${sub}</span>
        </div>
      </button>
    `;
  }).join('');

  document.getElementById('stock-modal').style.display = 'flex';
}

function getAllWorkingUnits() {
  const list = [...unitBatch];
  const cur = captureCurrentUnit();
  const f = cur.rawFields || {};
  const hasActiveData = Boolean(
    f.unitTag || f.model || f.serial || f.desc || f.laborNotes ||
    (f.stockData && f.stockData.length > 0) ||
    (f.vendorData && f.vendorData.length > 0)
  );

  // If the current screen has data and isn't already saved at editingIndex, include it automatically
  if (editingIndex >= 0 && list[editingIndex]) {
    list[editingIndex] = cur;
  } else if (hasActiveData) {
    const alreadyInBatch = list.some(u => u.label === cur.label && u.rawFields?.serial === f.serial);
    if (!alreadyInBatch) list.push(cur);
  }
  return list.length > 0 ? list : [cur];
}


function buildVendorUnitBlock(unitObj, targetVendor) {
  const f = unitObj.rawFields || {};
  const vRows = f.vendorData || [];
  const unitBrand = (unitObj.brand || '').toUpperCase();

  // Keep only non-stock parts assigned to targetVendor (or blank vendor when unit brand matches)
  const matchingParts = vRows.filter(p => {
    const rowVendor = (p.vendor || '').trim().toUpperCase();
    if (rowVendor) return rowVendor === targetVendor || rowVendor.includes(targetVendor) || targetVendor.includes(rowVendor);
    return unitBrand === targetVendor;
  });

  if (matchingParts.length === 0) return null;

  const partLines = matchingParts.map(p => {
    const label = [p.desc, p.part ? `P/N: ${p.part}` : ''].filter(Boolean).join(' ');
    return `${p.qty}--${label}`;
  });

  const addrRaw = document.getElementById('addr')?.value.trim() || '';
  const areaMatch = addrRaw.match(/\(([^)]+)\)\s*$/);
  const serviceArea = areaMatch ? areaMatch.at(1).trim() : '';

  const specLines = [
    unitObj.label,
    `Make: ${unitBrand || 'N/A'}`,
    f.model ? `Model: ${f.model.toUpperCase()}` : '',
    f.serial ? `Serial #: ${f.serial.toUpperCase()}` : '',
    f.equipDesc ? `Description: ${f.equipDesc.toUpperCase()}` : '',
    serviceArea ? `Service Area: ${serviceArea}` : '',
    f.year ? `Year: ${f.year}` : ''
  ].filter(Boolean).join('\n');

  return {
    label: unitObj.label,
    text: `${unitObj.label}:\n${partLines.join('\n')}\n\n${specLines}`
  };
}

function sendVendorQuoteEmail(targetVendor) {
  const items = getAllWorkingUnits();

  // 1. Strictly match parts assigned to targetVendor (or blank vendor when unit brand matches)
  let eligible = items
    .map(u => buildVendorUnitBlock(u, targetVendor))
    .filter(Boolean);

  // 2. Only fall back to "all non-stock parts" if targetVendor is a general supply house
  //    (not an equipment manufacturer in KNOWN_BRANDS) and no rows were tagged for it
  const isEquipBrand = (typeof KNOWN_BRANDS !== 'undefined') && KNOWN_BRANDS.includes(targetVendor);
  if (eligible.length === 0 && !isEquipBrand) {
    const withAnyVendorParts = items.filter(u => u.rawFields?.vendorData?.length > 0);
    const fallbackUnits = withAnyVendorParts.length > 0 ? withAnyVendorParts : items;
    eligible = fallbackUnits.map(u => ({ label: u.label, text: u.vendorText }));
  }

  if (eligible.length === 0) {
    alert(`No non-truck-stock parts are assigned to ${targetVendor}.`);
    return;
  }

  const proceedWithSelectedUnits = (chosenBlocks) => {
    const subject = getEmailSubjectPrefix(chosenBlocks.map(u => u.label).join(', '));
    const officeList = (typeof EMAIL_DIRECTORY !== 'undefined' && EMAIL_DIRECTORY.OFFICE) || [];
    const ccEmail = officeList.length ? officeList.at(0).email : '';

    const sendWithTo = (toEmail) => {
      document.getElementById('btn-add-selected-stock').style.display = 'block';
      closeStockModal();
      const body = [
        `Need price and availability on:`,
        ``,
        chosenBlocks.map(u => u.text).join('\n\n------------------------------\n\n')
      ].join('\n');
      launchEmail(subject, body, toEmail, ccEmail);
    };

    const entries = (typeof EMAIL_DIRECTORY !== 'undefined' && EMAIL_DIRECTORY[targetVendor]) || [];
    if (entries.length > 1) {
      openEmailBranchPicker(`Select ${targetVendor} Branch`, entries, sendWithTo);
    } else {
      sendWithTo(entries.length === 1 ? entries.at(0).email : '');
    }
  };

  if (eligible.length > 1) {
    document.getElementById('stock-modal-title').textContent = `Units to Include for ${targetVendor}`;
    const listEl = document.getElementById('stock-modal-list');
    const addBtn = document.getElementById('btn-add-selected-stock');
    addBtn.style.display = 'block';
    addBtn.textContent = `Continue (${eligible.length})`;

    listEl.innerHTML = eligible.map((u, idx) => `
      <label class="modal-item">
        <input type="checkbox" class="unit-pick-cb" value="${idx}" checked>
        <div>
          <strong style="color:#4da3ff;">${u.label}</strong><br>
          <span style="font-size:13px; color:#ccc;">${u.text.split('\n').slice(1, 3).join(', ')}</span>
        </div>
      </label>
    `).join('');

    listEl.querySelectorAll('.unit-pick-cb').forEach(cb => {
      cb.onchange = () => {
        const count = listEl.querySelectorAll('.unit-pick-cb:checked').length;
        addBtn.textContent = `Continue (${count})`;
      };
    });

    addBtn.onclick = () => {
      const checkedIndices = [...listEl.querySelectorAll('.unit-pick-cb:checked')].map(cb => Number(cb.value));
      if (checkedIndices.length === 0) return;
      addBtn.onclick = confirmStockModal;
      proceedWithSelectedUnits(checkedIndices.map(i => eligible[i]));
    };

    document.getElementById('stock-modal').style.display = 'flex';
  } else {
    proceedWithSelectedUnits(eligible);
  }
}




  

function emailOffice() {
  const officeList = (typeof EMAIL_DIRECTORY !== 'undefined' && EMAIL_DIRECTORY.OFFICE) || [];
  if (officeList.length > 1) {
    openEmailBranchPicker('Select Office', officeList, (toEmail) => {
      launchEmail(getEmailSubjectPrefix(), buildQuoteText(), toEmail);
    });
  } else {
    const toEmail = officeList.length === 1 ? officeList.at(0).email : '';
    launchEmail(getEmailSubjectPrefix(), buildQuoteText(), toEmail);
  }
}

function buildQuoteText() {
  const items = getAllWorkingUnits();

  const smPlusAll = items
    .filter(u => u.smPlusLines && u.smPlusLines.length > 0)
    .map(u => `[${u.label}]\n${u.smPlusLines.join('\n')}`)
    .join('\n\n');

  return [
    items.map(u => u.officeText).join('\n\n==============================\n\n'),
    smPlusAll ? `\n==============================\nSM+ TRUCK STOCK:\n${smPlusAll}` : ''
  ].filter(Boolean).join('\n');
}


function generateOutput() {
  const text = buildQuoteText();
  const outBox = document.getElementById('output');
  outBox.style.display = 'block';
  outBox.value = text;
  outBox.select();
  copyTextSafe(text);
  document.execCommand('copy');
}

function downloadFile() {
  const text = buildQuoteText();
  const custClean = (document.getElementById('cust').value.trim() || 'Cust').replace(/[^a-zA-Z0-9_-]/g, '_');
  const woClean = (document.getElementById('wo').value.trim() || 'WO').replace(/[^a-zA-Z0-9_-]/g, '_');
  const unitClean = (unitBatch.length > 0 ? unitBatch.map(u => u.label).join('_') : (getUnitTag() || 'Unit')).replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${dateStr}_${custClean}_${woClean}_${unitClean}.txt`;
  link.click();
}

function saveSessionState() {
  let current = {};
  try {
    current = captureCurrentUnit().rawFields;
  } catch (e) {}

  const state = {
    wo: document.getElementById('wo')?.value || '',
    po: document.getElementById('po')?.value || '',
    cust: document.getElementById('cust')?.value || '',
    addr: document.getElementById('addr')?.value || '',
    current,
    unitBatch,
    editingIndex
  };
  localStorage.setItem('hvacQuoteState', JSON.stringify(state));
}

function restoreSessionState() {
  const raw = localStorage.getItem('hvacQuoteState');
  if (!raw) {
    addStockRow('', '');
    updateBatchUI();
    return;
  }
  try {
    const state = JSON.parse(raw);
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('wo', state.wo);
    setVal('po', state.po);
    setVal('cust', state.cust);
    setVal('addr', state.addr);

    const f = state.current || {};
    setVal('unitTag', f.unitTag);
    setVal('brand', f.brand);
    setVal('year', f.year);
    setVal('equipDesc', f.equipDesc);
    setVal('model', f.model);
    setVal('serial', f.serial);
    setVal('desc', f.desc);
    setVal('laborNotes', f.laborNotes);
    document.getElementById('stock-container').innerHTML = '';
    const stocks = (f.stockData && f.stockData.length) ? f.stockData : [{ qty: '', code: '' }];
    stocks.forEach(s => addStockRow(s.qty, s.code));

    document.getElementById('vendor-parts-container').innerHTML = '';
    (f.vendorData || []).forEach(v => addVendorRow(v.qty, v.desc || '', v.part || '', v.price || '', v.vendor || ''));

    unitBatch = Array.isArray(state.unitBatch) ? state.unitBatch : [];
    editingIndex = typeof state.editingIndex === 'number' ? state.editingIndex : -1;
    updateBatchUI();
  } catch (e) {
    console.error('Failed to restore session state:', e);
    addStockRow('', '');
    updateBatchUI();
  }
}


function confirmNewJob() {
  if (!confirm('Are you sure? You will lose all info for this job.')) return;
  localStorage.removeItem('hvacQuoteState');
  ['wo', 'po', 'cust', 'addr'].forEach(id => document.getElementById(id).value = '');
  unitBatch = [];
  editingIndex = -1;
  resetUnitFields();
  document.getElementById('output').style.display = 'none';
  document.getElementById('paste-status').textContent = 'Cleared for new job.';
  updateBatchUI();
}

window.addEventListener('DOMContentLoaded', () => {
  renderTemplatePills();
  renderCategoryButtons();
  restoreSessionState();
  ['unitTag', 'model', 'serial'].forEach(id => {
    document.getElementById(id)?.addEventListener('focus', showManualBatchToast);
  });
  document.body.addEventListener('input', saveSessionState);
  document.body.addEventListener('click', () => setTimeout(saveSessionState, 50));
});

window.addEventListener('pageshow', () => {
  restoreSessionState();
});







