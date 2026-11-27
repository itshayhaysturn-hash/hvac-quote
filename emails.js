const RAW_EMAILS = `
[OFFICE]
Denton Quotes - denton404quotes@nextechna.com

[OTHER]
Other - Enter Email in Mail

[LENNOX | samsung, armstrong]
National Accounts - LNXNationalAccountsParts@Lennoxind.com

[TRANE | american standard]
Strategic Tier(national) - strategictier@trane.com

[CARRIER | bryant, payne, icp]
Carrier(NATIONAL) - SCOrders@carrierenterprise.com

[GOODMAN/DAIKIN]
Denton - br390@daikincomfort.com

[UNITED REFRIGERATION]
Denton - branch413@uri.com
Fort Worth(forum Way) - brancha1@uri.com
Fort Worth(meachum) - brancht5@uri.com

[CENTURY | york, champion, rudd, weatherking]
Fort Worth - chris@century.com

[TEXAS AIRE]
Parts(state) - parts@texasairesystems.com
Fort Worth - quotes@texasaire.com

[BAKER DISTRIBUTING | heil, grand aire, comfort maker]
Denton(juan garcia) - jgarcia@bakerdist.com
Denton(george prentice) - gprentice@bakerdist.com

[PARTS TOWN | all refrigeration appliances]
Parts Town(national) - cms@partstown.com

[COUNTER ONLY]
HOME DEPOT
GRAINGER
LOWES

[ALT VENDORS]
[JOHNSON CONTROL]
CENTURY
TEXAS AIRE

[YORK]
CENTURY
TEXAS AIRE
`;

const { EMAIL_DIRECTORY, ALT_VENDOR_MAP, VENDOR_NOTES, ALL_VENDORS } = (() => {
  let currentSection = '';
  let mode = 'EMAIL'; // 'EMAIL' | 'COUNTER' | 'ALT'
  const dir = {};
  const alt = {};
  const notes = {};
  const vendorSet = new Set();

  RAW_EMAILS.trim().split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) return;

    const headerMatch = line.match(/^\[(.+)\]$/);
    if (headerMatch) {
      const rawHeader = headerMatch.at(1).trim();
      const upperHeader = rawHeader.toUpperCase();

      if (upperHeader === 'ALT VENDORS' || upperHeader === 'ALT VENDOR') {
        mode = 'ALT';
        currentSection = '';
        return;
      }
      if (upperHeader === 'COUNTER ONLY' || upperHeader === 'WALK IN') {
        mode = 'COUNTER';
        currentSection = '';
        return;
      }

      // Split "VENDOR NAME | helper note" cleanly
      const [namePart, notePart] = rawHeader.split('|').map(s => s.trim());
      currentSection = namePart.toUpperCase();

      if (mode === 'ALT') {
        if (!alt[currentSection]) alt[currentSection] = [];
      } else {
        mode = 'EMAIL';
        if (!dir[currentSection]) dir[currentSection] = [];
        if (notePart) notes[currentSection] = notePart;
        if (currentSection !== 'OFFICE' && currentSection !== 'OTHER') {
          vendorSet.add(currentSection);
        }
      }
      return;
    }

    if (mode === 'ALT' && currentSection) {
      const vendorName = line.split(' - ').at(0).trim().toUpperCase();
      if (vendorName && !alt[currentSection].includes(vendorName)) {
        alt[currentSection].push(vendorName);
      }
    } else if (mode === 'COUNTER') {
      const [namePart, notePart] = line.split('|').map(s => s.trim());
      const cleanName = namePart.toUpperCase();
      if (cleanName) {
        vendorSet.add(cleanName);
        if (notePart) notes[cleanName] = notePart;
      }
    } else if (mode === 'EMAIL' && currentSection && line.includes(' - ')) {
      const [label, email] = line.split(' - ').map(s => s.trim());
      dir[currentSection].push({ label, email });
    }
  });

  return {
    EMAIL_DIRECTORY: dir,
    ALT_VENDOR_MAP: alt,
    VENDOR_NOTES: notes,
    ALL_VENDORS: [...vendorSet]
  };
})();
