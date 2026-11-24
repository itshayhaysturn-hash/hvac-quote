const TRUCK_STOCK_CATALOG = [
  { code: '15SS', desc: '15% Silver Solder Stick' },
  { code: 'OXY', desc: 'Oxygen (1/10 Bottle Use)' },
  { code: 'ACET', desc: 'Acetylene (1/10 Bottle Use)' },
  { code: 'NITRO', desc: 'Nitrogen Purge' },
  { code: 'MWELD', desc: 'Master Weld / Brazing Kit' },
  { code: 'THTRP', desc: 'Thermal Heat Trap Paste' },
  { code: '388', desc: '3/8" 8 Cubic Solder Liquid Line Drier' },
  { code: '1216BFWD', desc: '1/2" Sweat 16 Cubic Bi-Flo Liquid Line Drier' },
  { code: '3P40A24V', desc: '3 Pole 40 Amp 24V Contactor' },
  { code: 'R410A', desc: 'R-410A Refrigerant (lb)' },
  { code: 'R404A', desc: 'R-404A Refrigerant (lb)' },
  { code: 'R290', desc: 'R-290 Propane Refrigerant (Can/Oz)' }
];

const JOB_TEMPLATES = {
  compressor: {
    vendorParts: [
      { qty: 1, desc: 'COMPRESSOR', part: '', price: '' }
    ],
    stockItems: [
      { qty: '', code: 'AUTO_REFR' },
      { qty: '', code: 'MWELD' },
      { qty: 1, code: '388' },
      { qty: 1, code: '3P40A24V' }
    ]
  },
  txv: {
    vendorParts: [
      { qty: 1, desc: 'TXV', part: '', price: '' }
    ],
    stockItems: [
      { qty: '', code: 'AUTO_REFR' },
      { qty: '', code: 'MWELD' },
      { qty: 1, code: 'THTRP' },
      { qty: 1, code: '388' }
    ]
  }
};

const KNOWN_BRANDS = [
  'TRANE', 'CARRIER', 'LENNOX', 'YORK', 'DAIKIN', 'GOODMAN',
  'RHEEM', 'RUUD', 'AAON', 'COPELAND', 'HEATCRAFT', 'BOHN',
  'HUSSMANN', 'TRUE', 'BEVERAGE-AIR', 'MANITOWOC', 'HOSHIZAKI', 'SCOTSMAN'
];
