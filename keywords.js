// Format:
// [keyword or phrase to watch for in Description of Findings]
// Qty - Part Description - Optional Part #
const RAW_VENDOR_KEYWORDS = `
[needs new controller]
1 - Replacement Temperature Controller

[control board]
1 - Main Control Board

[heat exchanger]
1 - Heat Exchanger Assembly (Complete with Gaskets & Baffles)

[inducer motor]
1 - Draft Inducer Motor Assembly

[blower motor]
1 - Evaporator / Indoor Blower Motor

[condenser fan motor]
1 - Condenser Fan Motor

[compressor]
1 - Replacement Compressor

[txv]
1 - Thermal Expansion Valve (TXV)
`;

const VENDOR_KEYWORD_RULES = (() => {
  let currentTrigger = '';
  const rules = {};
  RAW_VENDOR_KEYWORDS.trim().split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) return;
    const trigMatch = line.match(/^\[(.+)\]$/);
    if (trigMatch) {
      currentTrigger = trigMatch.at(1).trim().toLowerCase();
      if (!rules[currentTrigger]) rules[currentTrigger] = [];
      return;
    }
    if (currentTrigger && line.includes(' - ')) {
      const [qty, desc, part] = line.split(' - ').map(s => s.trim());
      rules[currentTrigger].push({
        qty: qty || '1',
        desc: desc || '',
        part: part || ''
      });
    }
  });
  return rules;
})();
