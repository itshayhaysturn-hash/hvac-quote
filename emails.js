const RAW_EMAILS = `
[OFFICE]
Denton Quotes - denton404quotes@nextechna.com

[LENNOX]
National Accounts - LNXNationalAccountsParts@Lennoxind.com

[TRANE]
Strategic Tier - strategictier@trane.com

[CARRIER]
Parts - carrier@carrier.com

[UNITED REFRIGERATION]
Fort Worth - fortworth@uri.com
Dallas - dallas@uri.com
Denton - denton@uri.com

[OTHER]
Other - Enter Email in Mail 

[CENTURY]
Century - chris@century.com

[TEXAS AIRE]
Texas Aire - quotes@texasaire.com

[ALT VENDORS]
[JOHNSON CONTROL]
CENTURY
TEXAS AIRE

[YORK]
CENTURY
TEXAS AIRE

[GOODMAN]
TEXAS AIRE
CENTURY


`;

const { EMAIL_DIRECTORY, ALT_VENDOR_MAP } = (() => {
  let currentSection = '';
  let inAltMode = false;
  const dir = {};
  const alt = {};

  RAW_EMAILS.trim().split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) return;

    const headerMatch = line.match(/^\[(.+)\]$/);
    if (headerMatch) {
      const tag = headerMatch.at(1).trim().toUpperCase();
      if (tag === 'ALT VENDORS' || tag === 'ALT VENDOR') {
        inAltMode = true;
        currentSection = '';
        return;
      }
      currentSection = tag;
      if (inAltMode) {
        if (!alt[currentSection]) alt[currentSection] = [];
      } else {
        if (!dir[currentSection]) dir[currentSection] = [];
      }
      return;
    }

    if (inAltMode && currentSection) {
      const vendorName = line.split(' - ').at(0).trim().toUpperCase();
      if (vendorName && !alt[currentSection].includes(vendorName)) {
        alt[currentSection].push(vendorName);
      }
    } else if (!inAltMode && currentSection && line.includes(' - ')) {
      const [label, email] = line.split(' - ').map(s => s.trim());
      dir[currentSection].push({ label, email });
    }
  });

  return { EMAIL_DIRECTORY: dir, ALT_VENDOR_MAP: alt };
})();
