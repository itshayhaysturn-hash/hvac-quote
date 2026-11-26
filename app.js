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
    : (unitBatch.length > 0 ? unitBatch.map(u => u.label).join(', ') : getUnitTag());
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

function parseText(raw) {
  let updated = [];
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
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

function renderCategoryButtons() {
  const bar = document.getElementById('stock-category-bar');
  if (!bar || typeof TRUCK_STOCK_CATALOG === 'undefined') return;
  const categories = [...new Set(TRUCK_STOCK_CATALOG.map(item => item.category))];
  bar.innerHTML = categories.map(cat =>
    `<button type="button" class="cat-pill" onclick="openStockCategory('${cat}')">${cat}</button>`
  ).join('');
}

function getPartIcon(code) {
  const wrap = (inner) => `<svg width="46" height="46" viewBox="0 0 46 46" xmlns="http://w3.org" style="background:#161616; border-radius:8px; border:1px solid #3a3a3a; flex-shrink:0;">${inner}</svg>`;

  // Pigtail Closed-End Crimp Caps (ETPTC1810 = Yellow/Clear, ETPTC2214 = Blue/Clear)
  if (code === 'ETPTC1810' || code === 'ETPTC2214') {
    const capColor = code === 'ETPTC1810' ? '#ffca28' : '#42a5f5';
    return wrap(`
      <path d="M16 7 C16 4, 30 4, 30 7 L32 28 L14 28 Z" fill="${capColor}" fill-opacity="0.35" stroke="${capColor}" stroke-width="1.8"/>
      <rect x="18" y="10" width="10" height="14" rx="1.5" fill="#d4af37" stroke="#f57f17" stroke-width="1"/>
      <line x1="20" y1="24" x2="18" y2="41" stroke="#ef5350" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="26" y1="24" x2="28" y2="41" stroke="#42a5f5" stroke-width="2.6" stroke-linecap="round"/>
    `);
  }

  // Straight Butt Splice Connectors (Red 22-18, Blue 16-14, Yellow #10)
  if (code === 'ETBC2218' || code === 'ETBC1614' || code === 'EBC10') {
    const sleeve = code === 'ETBC2218' ? '#ef5350' : (code === 'ETBC1614' ? '#29b6f6' : '#ffca28');
    return wrap(`
      <line x1="4" y1="23" x2="14" y2="23" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <line x1="32" y1="23" x2="42" y2="23" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <rect x="12" y="16" width="22" height="14" rx="3" fill="${sleeve}" fill-opacity="0.85" stroke="#fff" stroke-width="1"/>
      <rect x="19" y="16" width="8" height="14" fill="#d4af37" fill-opacity="0.7"/>
    `);
  }

  // Female Spade Slide-On Terminals (Yellow 12-10 / #10)
  if (code === 'ETFC1210' || code === 'EFC10') {
    return wrap(`
      <line x1="5" y1="23" x2="14" y2="23" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <rect x="13" y="17" width="13" height="12" rx="2" fill="#ffca28" stroke="#fff" stroke-width="1"/>
      <path d="M26 15 L40 15 L40 31 L26 31 Z" fill="#cfd8dc" stroke="#90a4ae" stroke-width="1.2"/>
      <line x1="28" y1="20" x2="39" y2="20" stroke="#37474f" stroke-width="1.5"/>
      <line x1="28" y1="26" x2="39" y2="26" stroke="#37474f" stroke-width="1.5"/>
    `);
  }

  // Ring Terminals (Blue 16-14, Yellow 12-10)
  if (code === 'ETRING1614' || code === 'ETRING1210') {
    const sleeve = code === 'ETRING1614' ? '#29b6f6' : '#ffca28';
    return wrap(`
      <line x1="4" y1="23" x2="12" y2="23" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
      <rect x="11" y="17" width="12" height="12" rx="2" fill="${sleeve}" stroke="#fff" stroke-width="1"/>
      <circle cx="32" cy="23" r="9" fill="#cfd8dc" stroke="#90a4ae" stroke-width="1.5"/>
      <circle cx="32" cy="23" r="4" fill="#161616"/>
    `);
  }

  // Seal Tight Straight vs 90-Degree Liquidtight Connectors
  if (code === '34STC') {
    return wrap(`
      <rect x="8" y="15" width="30" height="16" rx="2" fill="#90a4ae" stroke="#eceff1" stroke-width="1.2"/>
      <rect x="16" y="13" width="6" height="20" fill="#607d8b"/>
      <rect x="26" y="13" width="6" height="20" fill="#607d8b"/>
    `);
  }
  if (code === '34STC90') {
    return wrap(`
      <path d="M12 34 L12 20 Q12 12 20 12 L34 12 L34 24 L24 24 L24 34 Z" fill="#90a4ae" stroke="#eceff1" stroke-width="1.2"/>
    `);
  }

  return '';
}



function openStockCategory(category) {
  modalSelectedCodes.clear();
  document.getElementById('stock-modal-title').textContent = `${category} — Tap to Select`;
  const listEl = document.getElementById('stock-modal-list');
  const items = TRUCK_STOCK_CATALOG.filter(i => i.category === category);

    listEl.innerHTML = items.map(item => `
    <label class="modal-item">
      <input type="checkbox" value="${item.code}" onchange="toggleModalCode('${item.code}', this.checked)">
      ${getPartIcon(item.code)}
      <div>
        <strong style="color:#4da3ff;">${item.code}</strong><br>
        <span style="font-size:14px; color:#ccc;">${item.desc}</span>
      </div>
    </label>
  `).join('');


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
    <input type="number" class="v-qty" placeholder="Qty" min="1" step="any" value="${qty}" inputmode="decimal" onchange="clampQty(this)">
    <input type="text" class="v-desc" placeholder="Description" value="${desc}">
    <input type="text" class="v-part" placeholder="Part #" value="${part}">
    <input type="text" class="v-price" placeholder="Price $" value="${price}" inputmode="decimal">
    <input type="text" class="v-vendor" placeholder="Vendor" value="${defaultVendor}">
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">X</button>
  `;
  container.appendChild(row);
}

function checkKeywords() {
  const text = document.getElementById('desc').value.toLowerCase();
  for (const [keyword, template] of Object.entries(JOB_TEMPLATES)) {
    if (text.includes(keyword) && activeTrigger !== keyword) {
      activeTrigger = keyword;

      const stockContainer = document.getElementById('stock-container');
      if (stockContainer.lastElementChild && !stockContainer.lastElementChild.querySelector('.code').value.trim()) {
        stockContainer.lastElementChild.remove();
      }

      const existingCodes = new Set(
  [...stockContainer.querySelectorAll('.code')].map(el => el.value.split(' - ')[0].trim().toUpperCase())
     );


      const autoRefr = detectRefrigerant();
      template.stockItems.forEach(item => {
        const finalCode = item.code === 'AUTO_REFR' ? autoRefr : item.code;
        if (!existingCodes.has(finalCode.toUpperCase())) {
          addStockRow(item.qty, finalCode);
        }
      });

      const vendorContainer = document.getElementById('vendor-parts-container');
      const existingVendorDescs = new Set(
        [...vendorContainer.querySelectorAll('.v-desc')].map(el => el.value.trim().toUpperCase())
      );

      template.vendorParts.forEach(vp => {
        const vDesc = (vp.desc || '').toUpperCase();
        if (!vDesc || !existingVendorDescs.has(vDesc)) {
          addVendorRow(vp.qty, vp.desc || '', vp.part || '', vp.price || '', '');
        }
      });

      saveSessionState();
      return;
    }
  }
  if (activeTrigger && !text.includes(activeTrigger)) activeTrigger = '';
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
      officePartLines.push(`${dQty}--${fullDisplay}`);
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
      officePartLines.push(`${vQty}--${partLabel}${vendorTag}${priceTag}`);
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
    laborNotes ? `\n${laborNotes}` : ''
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
  const vendorContainer = document.getElementById('vendor-buttons-container');

  actionBtn.textContent = editingIndex >= 0 ? `Update ${unitBatch[editingIndex].label} in Batch` : '+ Add Unit to Batch';
  if (clearBtn) {
    clearBtn.textContent = editingIndex >= 0 ? `Remove ${unitBatch[editingIndex].label}` : 'Clear All';
    clearBtn.onclick = editingIndex >= 0 ? () => removeBatchUnit(editingIndex) : clearBatch;
  }

  pillsEl.innerHTML = unitBatch.map((u, i) => `
    <div class="batch-pill ${i === editingIndex ? 'editing' : ''}" onclick="recallBatchUnit(${i})">
      <span>${u.label} (${u.brand})</span>
      <span class="pill-del" title="Remove unit" onclick="removeBatchUnit(${i}, event)">&times;</span>
    </div>
  `).join('');

  const items = unitBatch.length > 0 ? unitBatch : [captureCurrentUnit()];
  statusEl.textContent = unitBatch.length === 0
    ? 'Batch: 0 units (will send current unit)'
    : `Tap a unit pill to edit, or tap × to remove (${unitBatch.length} batched):`;
  officeBtn.textContent = unitBatch.length > 0 ? `Email Quote to Office (${unitBatch.length} Units)` : 'Email Quote to Office';

  const brands = [...new Set(items.map(u => u.brand))];
  vendorContainer.innerHTML = '';
  brands.forEach(brandName => {
    const count = items.filter(u => u.brand === brandName).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-vendor';
    btn.textContent = count > 1 ? `Email ${brandName} (${count} Units)` : `Email ${brandName} for Price & Availability`;
    btn.onclick = () => emailVendorByBrand(brandName);
    vendorContainer.appendChild(btn);
  });
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

function emailVendorByBrand(targetBrand) {
  const items = unitBatch.length > 0 ? unitBatch : [captureCurrentUnit()];
  const matching = items.filter(u => u.brand === targetBrand);
  const subject = getEmailSubjectPrefix(matching.map(u => u.label).join(', '));

  const toEmail = (typeof VENDOR_EMAILS !== 'undefined' && VENDOR_EMAILS[targetBrand])
    ? VENDOR_EMAILS[targetBrand]
    : '';
  const ccEmail = (typeof OFFICE_EMAIL !== 'undefined') ? OFFICE_EMAIL : '';

  const body = [
    `Need price and availability on:`,
    ``,
    matching.map(u => u.vendorText).join('\n\n------------------------------\n\n')
  ].join('\n');

  launchEmail(subject, body, toEmail, ccEmail);
}

function emailOffice() {
  const toEmail = (typeof OFFICE_EMAIL !== 'undefined') ? OFFICE_EMAIL : '';
  launchEmail(getEmailSubjectPrefix(), buildQuoteText(), toEmail);
}

function buildQuoteText() {
  const items = unitBatch.length > 0 ? unitBatch : [captureCurrentUnit()];

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
  renderCategoryButtons();
  restoreSessionState();
  document.body.addEventListener('input', saveSessionState);
  document.body.addEventListener('click', () => setTimeout(saveSessionState, 50));
});

window.addEventListener('pageshow', () => {
  restoreSessionState();
});







