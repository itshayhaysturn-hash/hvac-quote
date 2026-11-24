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
  return /\b(REFR|REFRIGERATION|COOLER|FREEZER|WIC|WIF|REACH)\b/.test(combined) ? 'R404A' : 'R410A';
}


function getEmailSubjectPrefix(customUnitList) {
  const wo = document.getElementById('wo').value.trim();
  const cust = document.getElementById('cust').value.trim();
  const unitsList = customUnitList || (
    unitBatch.length > 0 ? unitBatch.map(u => u.label).join(', ') : getUnitTag()
  );
  return [wo, unitsList, cust].filter(Boolean).join(' ') || 'HVACR Quote';
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

  const woVal = grabMatch(raw, /(?:^|[^A-Z])(?:PM)?WO\s*#?[\s:\-]+([A-Z0-9\-]+)/i);
  if (woVal) { document.getElementById('wo').value = woVal; updated.push('WO #'); }

  const poVal = grabMatch(raw, /Cust\s*PO\s*#?[\s:\-]+([A-Z0-9\-]+)/i);
  if (poVal) { document.getElementById('po').value = poVal; updated.push('Cust PO'); }

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

function addStockRow(qty, code) {
  const container = document.getElementById('stock-container');
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="number" class="qty" placeholder="Qty" min="1" step="1" value="${qty}" inputmode="decimal" onchange="clampQty(this)">
    <input type="text" class="code" placeholder="Search code or part name" value="${code}" oninput="filterStock(this)" onfocus="filterStock(this)">
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
  row.querySelector('.code').value = code;
  row.querySelector('.search-dropdown').style.display = 'none';
  const container = document.getElementById('stock-container');
  if (row === container.lastElementChild) addStockRow('', '');
}

document.addEventListener('click', e => {
  if (!e.target.classList.contains('code')) {
    document.querySelectorAll('.search-dropdown').forEach(d => d.style.display = 'none');
  }
});

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
      document.getElementById('stock-container').innerHTML = '';
      document.getElementById('vendor-parts-container').innerHTML = '';
      const autoRefr = detectRefrigerant();
      template.stockItems.forEach(item => {
        addStockRow(item.qty, item.code === 'AUTO_REFR' ? autoRefr : item.code);
      });
      template.vendorParts.forEach(vp => {
        addVendorRow(vp.qty, vp.desc || '', vp.part || '', vp.price || '', '');
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
  const prefer = document.getElementById('prefer')?.value.trim() || '';
  const year = document.getElementById('year')?.value.trim() || 'N/A';
  const equipDesc = document.getElementById('equipDesc')?.value.trim() || 'N/A';
  const model = document.getElementById('model')?.value.trim() || 'N/A';
  const serial = document.getElementById('serial')?.value.trim() || 'N/A';
  const desc = document.getElementById('desc')?.value.trim() || 'No findings entered';

  const stockRows = document.querySelectorAll('#stock-container .item-row');
  let stockData = [], readableStock = [], smPlusLines = [];
  stockRows.forEach(row => {
    const qty = row.querySelector('.qty').value.trim();
    const code = row.querySelector('.code').value.trim().toUpperCase();
    if (code) {
      const dQty = qty || '0';
      stockData.push({ qty, code });
      readableStock.push(`${dQty}--${code}`);
      smPlusLines.push(`${code}\t${dQty}`);
    }
  });

  const vendorRows = document.querySelectorAll('#vendor-parts-container .vendor-row');
  let vendorData = [], readableVendor = [], partNames = [];
  vendorRows.forEach(row => {
    const qty = row.querySelector('.v-qty').value.trim();
    const vDesc = row.querySelector('.v-desc').value.trim().toUpperCase();
    const part = row.querySelector('.v-part').value.trim().toUpperCase();
    const price = row.querySelector('.v-price').value.trim();
    const vendor = row.querySelector('.v-vendor').value.trim().toUpperCase();
    if (vDesc || part) {
      vendorData.push({ qty, desc: vDesc, part, price, vendor });
      partNames.push(vDesc || part);
      readableVendor.push(`${qty || '1'} | DESC: ${vDesc || 'N/A'} | P/N: ${part || 'TBD'} | PRICE: ${price ? '$' + price.replace(/^\$/, '') : 'TBD'} | VENDOR: ${vendor || brand}`);
    }
  });

  const partsSummary = partNames.length ? partNames.join(', ') : 'Compressor';
  const vendorText = `${unit} - Part Needed: ${partsSummary}\nMake: ${brand}${year !== 'N/A' ? '\nYear: ' + year : ''}${equipDesc !== 'N/A' ? '\nUnit Type: ' + equipDesc : ''}\nModel #: ${model}\nSerial #: ${serial}`;
  const officeText = `=== UNIT: ${unit} (${brand}) ===\nUNIT / AREA: ${unitTagRaw || unit}\nPREFER VENDOR: ${prefer || 'N/A'}\nMAKE: ${brand}\nYEAR: ${year}\nDESCRIPTION: ${equipDesc}\nMODEL: ${model}\nSERIAL: ${serial}\n\nFINDINGS: ${desc}\n\nTRUCK STOCK:\n${readableStock.join('\n') || 'None'}\n\nNON-STOCK / VENDOR PARTS:\n${readableVendor.join('\n') || 'None'}\n\n--- SM+ COPY-PASTE (${unit}) ---\n${smPlusLines.join('\n') || 'None'}`;

  return {
    label: unit, brand, prefer,
    rawFields: {
      unitTag: unitTagRaw,
      brand: document.getElementById('brand')?.value.trim() || '',
      prefer,
      year: document.getElementById('year')?.value.trim() || '',
      equipDesc: document.getElementById('equipDesc')?.value.trim() || '',
      model: document.getElementById('model')?.value.trim() || '',
      serial: document.getElementById('serial')?.value.trim() || '',
      desc: document.getElementById('desc')?.value.trim() || '',
      stockData, vendorData
    },
    vendorText, officeText
  };
}

function resetUnitFields() {
  const addr = document.getElementById('addr').value.trim();
  const baseAddr = addr.replace(/\s*\([^)]*\)\s*$/, '').trim();
  document.getElementById('addr').value = /^(AC|RTU|CU|AHU|EF|MAU|WIC|WIF|REACH|ICE)[\s\-]*\d+/i.test(baseAddr) ? '' : baseAddr;
  ['unitTag', 'brand', 'year', 'equipDesc', 'model', 'serial', 'desc'].forEach(id => {
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

function launchEmail(subject, body) {
  saveSessionState();
  copyTextSafe(body);
  document.getElementById('paste-status').textContent = 'Email opened! (Multi-line quote copied to clipboard — press Ctrl+V in email if needed)';
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}



function emailVendorByBrand(targetBrand) {
  const items = unitBatch.length > 0 ? unitBatch : [captureCurrentUnit()];
  const matching = items.filter(u => u.brand === targetBrand);
  const prefix = getEmailSubjectPrefix(matching.map(u => u.label).join(', '));
  const preferNote = matching.find(u => u.prefer)?.prefer || document.getElementById('prefer')?.value.trim() || '';
  const wo = document.getElementById('wo').value.trim();

  const subject = `${prefix} - ${targetBrand} Price & Availability`;
  const body = `Prefer: ${preferNote}\nNeed price and availability on:\n\n${matching.map(u => u.vendorText).join('\n\n------------------------\n\n')}${wo ? '\n\nRef / WO #: ' + wo : ''}`;
  launchEmail(subject, body);
}

function emailOffice() {
  launchEmail(getEmailSubjectPrefix(), buildQuoteText());
}

function buildQuoteText() {
  const wo = document.getElementById('wo').value.trim() || 'N/A';
  const po = document.getElementById('po').value.trim() || 'N/A';
  const cust = document.getElementById('cust').value.trim() || 'N/A';
  const addr = document.getElementById('addr').value.trim() || 'N/A';
  const items = unitBatch.length > 0 ? unitBatch : [captureCurrentUnit()];
  return `=== CUSTOMER INFO ===\nWO #: ${wo}\nCUST PO #: ${po}\nCUSTOMER: ${cust}\nADDRESS / LOCATION: ${addr}\n\n${items.map(u => u.officeText).join('\n\n========================================\n\n')}`;
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
    setVal('prefer', f.prefer);
    setVal('year', f.year);
    setVal('equipDesc', f.equipDesc);
    setVal('model', f.model);
    setVal('serial', f.serial);
    setVal('desc', f.desc);

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
  restoreSessionState();
  document.body.addEventListener('input', saveSessionState);
  document.body.addEventListener('click', () => setTimeout(saveSessionState, 50));
});

window.addEventListener('pageshow', () => {
  restoreSessionState();
});





