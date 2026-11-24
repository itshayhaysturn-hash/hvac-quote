let activeTrigger = '';

function grabMatch(text, regex) {
  const m = text.match(regex);
  return (m && m.length > 1) ? m.at(1).trim() : '';
}

async function smartPaste() {
  const status = document.getElementById('paste-status');
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      status.textContent = 'Clipboard is empty.';
      return;
    }
    parseText(text);
  } catch (err) {
    status.textContent = 'Click inside the box below and press Ctrl+V.';
    document.getElementById('manual-paste').focus();
  }
}

function parseText(raw) {
  let updated = [];
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Work Order #
  const woVal = grabMatch(raw, /WO#?[\s:\-]*([A-Z0-9\-]+)/i);
  if (woVal) {
    document.getElementById('wo').value = woVal;
    updated.push('WO #');
  }

  // 2. Customer PO #
  const poVal = grabMatch(raw, /Cust\s*PO#?[\s:\-]*([A-Z0-9\-]+)/i);
  if (poVal) {
    document.getElementById('po').value = poVal;
    updated.push('Cust PO');
  }

  // 3. Equipment Make / Model / Serial / Description / Year
  const makeVal = grabMatch(raw, /Make[\s:\-]+(.+)/i);
  if (makeVal) {
    document.getElementById('brand').value = makeVal.toUpperCase();
    updated.push('Make');
  } else {
    for (let b of KNOWN_BRANDS) {
      if (new RegExp('\\b' + b + '\\b', 'i').test(raw)) {
        document.getElementById('brand').value = b;
        updated.push('Make');
        break;
      }
    }
  }

  const modelVal = grabMatch(raw, /Model#?[\s:\-]+([A-Z0-9\-\/]+)/i);
  if (modelVal) {
    document.getElementById('model').value = modelVal.toUpperCase();
    updated.push('Model');
  }

  const serialVal = grabMatch(raw, /Serial#?[\s:\-]+([A-Z0-9\-]+)/i);
  if (serialVal) {
    document.getElementById('serial').value = serialVal.toUpperCase();
    updated.push('Serial');
  }

  const equipDescVal = grabMatch(raw, /Description[\s:\-]+(.+)/i);
  if (equipDescVal) {
    document.getElementById('equipDesc').value = equipDescVal.toUpperCase();
    updated.push('Description');
  }

  const yearVal = grabMatch(raw, /Year[\s:\-]+(\d{4})/i);
  if (yearVal) {
    document.getElementById('year').value = yearVal;
    updated.push('Year');
  }

  // 4. Equipment Unit Tag & Service Area
  let unitTag = '';
  const unitLine = lines.find(l => /^(AC|RTU|CU|AHU|EF|MAU|WIC|WIF|REACH|ICE)[\s\-]*\d+/i.test(l));
  if (unitLine) {
    unitTag = grabMatch(unitLine, /^([A-Z]+[\s\-]*\d+)/i).toUpperCase();
  }
  const serviceArea = grabMatch(raw, /Service\s*Area[\s:\-]+(.+)/i);

  if (unitTag || serviceArea) {
    const currentAddr = document.getElementById('addr').value.trim();
    const tagInfo = [unitTag, serviceArea].filter(Boolean).join(' - ');
    if (currentAddr && !currentAddr.includes(tagInfo)) {
      document.getElementById('addr').value = `${currentAddr} (${tagInfo})`;
    } else if (!currentAddr) {
      document.getElementById('addr').value = tagInfo;
    }
    updated.push('Unit/Area');
  }

  // 5. Customer Name & Street Address
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

  const status = document.getElementById('paste-status');
  status.textContent = updated.length ? 'Filled: ' + updated.join(', ') : 'Checked text (no matching fields found).';
}

function emailVendor() {
  const brand = document.getElementById('brand').value.trim() || 'Vendor';
  const year = document.getElementById('year').value.trim();
  const equipDesc = document.getElementById('equipDesc').value.trim();
  const model = document.getElementById('model').value.trim() || '[Enter Model #]';
  const serial = document.getElementById('serial').value.trim() || '[Enter Serial #]';
  const wo = document.getElementById('wo').value.trim();

  let part = 'Compressor';
  const firstCode = document.querySelector('.item-row .code');
  if (firstCode && firstCode.value.trim()) {
    part = firstCode.value.trim();
  }

  const subject = `Quote Request: ${brand} ${part} - Model ${model}${wo ? ' (WO: ' + wo + ')' : ''}`;
  const body = `Hello ${brand} Parts,\n\nPlease provide part number, pricing, and availability for a replacement ${part} on the following unit:\n\nMake: ${brand}${year ? '\nYear: ' + year : ''}${equipDesc ? '\nUnit Type: ' + equipDesc : ''}\nModel #: ${model}\nSerial #: ${serial}${wo ? '\nRef / WO #: ' + wo : ''}\n\nThank you!`;

  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function checkKeywords() {
  const text = document.getElementById('desc').value.toLowerCase();
  const container = document.getElementById('items-container');

  for (const [keyword, items] of Object.entries(JOB_TEMPLATES)) {
    if (text.includes(keyword) && activeTrigger !== keyword) {
      activeTrigger = keyword;
      container.innerHTML = '';
      items.forEach(item => addRow(item.qty, item.code));
      return;
    }
  }

  if (activeTrigger && !text.includes(activeTrigger)) {
    activeTrigger = '';
  }
}

function addRow(qty, code) {
  const container = document.getElementById('items-container');
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="number" class="qty" placeholder="Qty" value="${qty}" inputmode="decimal">
    <input type="text" class="code" placeholder="Stock Code / Part" value="${code}">
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">X</button>
  `;
  container.appendChild(row);
}

function buildQuoteText() {
  const wo = document.getElementById('wo').value.trim() || 'N/A';
  const po = document.getElementById('po').value.trim() || 'N/A';
  const cust = document.getElementById('cust').value.trim() || 'N/A';
  const addr = document.getElementById('addr').value.trim() || 'N/A';
  const brand = document.getElementById('brand').value.trim() || 'N/A';
  const year = document.getElementById('year').value.trim() || 'N/A';
  const equipDesc = document.getElementById('equipDesc').value.trim() || 'N/A';
  const model = document.getElementById('model').value.trim() || 'N/A';
  const serial = document.getElementById('serial').value.trim() || 'N/A';
  const desc = document.getElementById('desc').value.trim() || 'No findings entered';

  const rows = document.querySelectorAll('.item-row');
  let readableLines = [];
  let smPlusLines = [];

  rows.forEach(row => {
    const qty = row.querySelector('.qty').value.trim();
    const code = row.querySelector('.code').value.trim().toUpperCase();
    if (code) {
      const displayQty = qty || '0';
      readableLines.push(`${displayQty}--${code}`);
      smPlusLines.push(`${code}\t${displayQty}`);
    }
  });

  return `=== 1. CUSTOMER INFO ===
WO #: ${wo}
CUST PO #: ${po}
CUSTOMER: ${cust}
ADDRESS / UNIT: ${addr}

=== 2. EQUIPMENT INFO ===
MAKE: ${brand}
YEAR: ${year}
DESCRIPTION: ${equipDesc}
MODEL: ${model}
SERIAL: ${serial}

=== 3. FINDINGS & PARTS ===
FINDINGS: ${desc}

TRUCK STOCK & PARTS:
${readableLines.join('\n') || 'None'}

--- SM+ COPY-PASTE (CODE [TAB] QTY) ---
${smPlusLines.join('\n') || 'None'}`;
}

function generateOutput() {
  const text = buildQuoteText();
  const outBox = document.getElementById('output');
  outBox.style.display = 'block';
  outBox.value = text;
  outBox.select();

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => document.execCommand('copy'));
  } else {
    document.execCommand('copy');
  }
}

function downloadFile() {
  const text = buildQuoteText();
  const custClean = (document.getElementById('cust').value.trim() || 'Cust').replace(/[^a-zA-Z0-9_-]/g, '_');
  const woClean = (document.getElementById('wo').value.trim() || 'WO').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${dateStr}_${custClean}_${woClean}.txt`;

  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Initialize with one blank row
window.addEventListener('DOMContentLoaded', () => {
  addRow('', '');
});
