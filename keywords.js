// Format:
// [keyword or phrase to watch for in Description of Findings]
// Qty - Part Description - Optional Part #
const RAW_VENDOR_KEYWORDS = `
[economizer actuator]
1 - economizer actuator, enclosed picture of model# on actuator.

[control board]
1 - Main Control Board.

[reversing valve]
1 - Reversing valve

[heat exchanger]
1 - Heat Exchanger Assembly (Complete with Gaskets & Baffles)..
1 - if no complete assembly would need all gaskets and escutcheons and plates/baffles.
1 - Feel free to send parts breakdown.

[inducer motor]
1 - Draft Inducer Motor Assembly with Gaskets.

[blower motor]
1 - Blower Motor(AKA Evaporator Motor).
1 - Sheave For Blower Motor(AKA Pulley).

[condenser fan motor]
1 - Condenser Fan Motor.
1 - Fan Blade for Condenser Fan Motor.

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
