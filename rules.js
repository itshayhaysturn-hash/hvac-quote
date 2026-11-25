

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

const OFFICE_EMAIL = 'denton404quotes@nextechna.com';

const VENDOR_EMAILS = {
  LENNOX: 'LNXNationalAccountsParts@Lennoxind.com'
};

