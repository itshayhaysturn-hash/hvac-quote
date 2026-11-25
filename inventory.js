const RAW_INVENTORY = `
[Brazing]
15SS - 15% Silver Solder Stick
OXY - Oxygen (1/10 Bottle Use)
ACET - Acetylene (1/10 Bottle Use)
NITRO - Nitrogen Purge
MWELD - Master Weld / Brazing Kit
THTRP - Thermal Heat Trap Paste

[Driers]
388 - 3/8" 8 Cubic Solder Liquid Line Drier
1216BFWD - 1/2" Sweat 16 Cubic Bi-Flo Liquid Line Drier

[Contactors]
3P40A24V - 3 Pole 40 Amp 24V Contactor

[Refrigerant]
MO99 - MO99 Refrigerant Per Pound
R134A - R134A Refrigerant Per Pound
R22 - R22 Refrigerant Per Pound
R290-S - R290-Refrigerant (Single Use)
R404 - R404A Refrigerant Per Pound
R407C - R407C Refrigerant Per Pound
R410A - R410A Refrigerant Per Pound
R422B - R422B Refrigerant Per Pound
R448A - R448A Refrigerant Per Pound
R449A - R449A Refrigerant Per Pound
R507 - R507 Refrigerant Per Pound
R513A - R513A Refrigerant Per Pound
`;

const TRUCK_STOCK_CATALOG = (() => {
  let currentCat = 'General';
  const items = [];
  RAW_INVENTORY.trim().split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;
    const catMatch = line.match(/^\[(.+)\]$/);
    if (catMatch) {
      currentCat = catMatch[1].trim();
      return;
    }
    if (line.includes(' - ')) {
      const [code, ...rest] = line.split(' - ');
      items.push({
        category: currentCat,
        code: code.trim().toUpperCase(),
        desc: rest.join(' - ').trim()
      });
    }
  });
  return items;
})();

