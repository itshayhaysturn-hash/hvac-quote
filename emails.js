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

`;

const EMAIL_DIRECTORY = (() => {
  let currentGroup = '';
  const dir = {};
  RAW_EMAILS.trim().split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;
    const grpMatch = line.match(/^\[(.+)\]$/);
    if (grpMatch) {
      currentGroup = grpMatch.at(1).trim().toUpperCase();
      if (!dir[currentGroup]) dir[currentGroup] = [];
      return;
    }
    if (currentGroup && line.includes(' - ')) {
      const [label, ...rest] = line.split(' - ');
      dir[currentGroup].push({
        label: label.trim(),
        email: rest.join(' - ').trim()
      });
    }
  });
  return dir;
})();
