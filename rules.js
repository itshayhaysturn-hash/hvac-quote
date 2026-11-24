// Truck Stock & Auto-Fill Job Rules
const JOB_TEMPLATES = {
  compressor: [
    { qty: 1, code: 'COMPRESSOR' },
    { qty: '', code: 'R410A' },
    { qty: '', code: 'MWELD' }
  ]
};

// Common HVACR Brands for Smart Paste fallback
const KNOWN_BRANDS = [
  'TRANE', 'CARRIER', 'LENNOX', 'YORK', 'DAIKIN', 'GOODMAN',
  'RHEEM', 'RUUD', 'AAON', 'COPELAND', 'HEATCRAFT', 'BOHN',
  'HUSSMANN', 'TRUE', 'BEVERAGE-AIR', 'MANITOWOC', 'HOSHIZAKI', 'SCOTSMAN'
];
