const RAW_INVENTORY = `
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

[Contactors]
2P40A120V - 40A 2P 120V Contactor
2P40A240V - 40A 2P 240V Contactor
3P40A120V - 40A 3P 120V Contactor
3P40A240V - 40A 3P 240V Contactor
3P60A240V - 60A 3P 240V Contactor
2P40A24V - 40A 2P 24V Contactor
3P40A24V - 40A 3P 24V Contactor
3P60A24V - 60A 3P 24V Contactor

[Relays]
STR9063 - Start Relay 90-63
STR9064 - Start Relay 90-64
STR9065 - Start Relay 90-65
STR9066 - Start Relay 90-66
STR9067 - Start Relay 90-67
STR9068 - Start Relay 90-68
PR90380 - Peanut Relay 90-380
SSHREL220 - Solid State Hardstart 220/240VAC
SSREL115 - Solid State 3N1 115-1/4 1/3
SW120 - Switching Relay 90-341 120V
SW24 - Switching Relay 90-340 24V
SW240 - Switching Relay 90-342 240V

[Capacitors (Run)]
5RC - 5X440 Oval Run Capacitor
75RC - 7.5X440 Oval Run Capacitor
10RC - 10X440 Oval Run Capacitor
125RC - 12.5X440 Oval Run Capacitor
15RC - 15X440 Oval Run Capacitor
20RC - 20X440 Oval Run Capacitor
25RC - 25X440 Oval Run Capacitor
30RC - 30X440 Oval Run Capacitor
35RC - 35X440 Oval Run Capacitor
40RC - 40X440 Oval Run Capacitor
45RC - 45X440 Oval Run Capacitor
50RC - 50X440 Oval Run Capacitor
RC55 - 55X440 MFD Run Capacitor

[Capacitors (Dual Run)]
355RCD - 35/5 MFD 440/370V Dual Run Capacitor
405RCD - 40/5 MFD 440/370V Dual Run Capacitor
445RCD - 44/5 MFD 440/370V Dual Run Capacitor
555RCD - 55/5 MFD 440/370V Dual Run Capacitor
805RCD - 60/5 MFD 440/370V Dual Run Capacitor

[Capacitors (Start)]
SC88250 - 88/250 Round Start Capacitor
SC88330 - 88/330 Round Start Capacitor
SC108250 - 108/250 Round Start Capacitor
SC124250 - 124/250 Round Start Capacitor
SC130250 - 130/250 Round Start Capacitor
SC189250 - 189/250 Round Start Capacitor
SC233250 - 233/250 Round Start Capacitor

[Motors]
35WM - 35W CW 115 GE Motor
6WM - 6W CW 115 GE Motor
9WM - 9W CW 115 GE Motor

[Fuses]
20FUSE250V - 20 Amp 250V Fuse
30FUSE250V - 30 Amp 250V Fuse
30FUSE600V - 30 Amp 600V Fuse
40FUSE250V - 40 Amp 250V Fuse
40FUSE600V - 40 Amp 600V Fuse
50FUSE250V - 50 Amp 250V Fuse
50FUSE600V - 50 Amp 600V Fuse
60FUSE250V - 60 Amp 250V Fuse
60FUSE600V - 60 Amp 600V Fuse

[PVC]
34PVCCAP - 3/4 PVC Cap
34PVCCOUP - Coupling PVC 3/4
34PVCPIPE - Pipe PVC 3/4 X 10 Ft Sch 40
34PVCTEE - 3/4 PVC Tees
34PVC90 - Elbow PVC 3/4
1PVCPIPE - Pipe PVC 1 X 10 Ft Sch 40
1PVC90 - Elbow PVC 1
1PVCCOUP - Coupling PVC 1
1PVCTEE - 1 PVC Tees

[Copper]
38C90LR - 3/8 Long Radius 90
38C90LRST - 3/8 Long Radius Street 90
38CC - 3/8 Copper Coupling
38CT - 3/8 Copper Tee
58C90LR - 5/8 Long Radius 90
58C90LRST - 5/8 Long Radius Street Copper 90
58CC - 5/8 Copper Coupling
58CT - 5/8 Copper Tee
34C90LR - 3/4 Long Radius 90
34C90LRST - 3/4 Long Radius Street Copper 90
34CC - 3/4 Copper Coupling
34CT - 3/4 Copper Tee
78C90LR - 7/8 Long Radius 90
78C90LRST - 7/8 Long Radius Street Copper 90
78CT - 7/8 Copper Tee

[Driers]
388 - 3/8" 8 Cubic Solder Liquid Line Drier
1216BFWD - 1/2" Sweat 16 Cubic Bi-Flo Liquid Line Drier

[Welding]
15SS - 15% Silver Solder Stick
OXY - Oxygen (1/10 Bottle Use)
ACET - Acetylene (1/10 Bottle Use)
NITRO - Nitrogen Purge
MWELD - Master Weld / Brazing Kit
MAPGAS - MAPP Gas 14.1oz
PFLUX - Paste Flux
THTRP - Heat Paste Thermo Trap Per Use

[Wire]
LVW188 - Low Voltage Wire 18-8 Per Ft
THHN8 - THHN Black 8 GA Per Foot
THHN10 - THHN Black 10 GA Per Foot
THHN12 - THHN Black 12 GA Per Foot
THHN14 - THHN Black 14 GA Per Foot

[Connectors & Seal Tight]
34STC - Seal Tight Str 3/4 Connector
34STC90 - Seal Tight 90 3/4 Connector
EBC10 - Butt Connector #10
EFC10 - Fem. Terminal #10
ETBC1614 - Elec. Butt Connector 16-14
ETBC2218 - Elec. Butt Connector 22-18
ETFC1210 - Elec. Female Connector 12-10
ETPTC1810 - Elec. Pigtail Connector 18-10
ETPTC2214 - Elec. Pigtail Connector 22-14
ETRING1210 - Elec. Terminal Ring 12-10
ETRING1614 - Elec. Terminal Ring 16-14

[Tape]
BLDT - Duct Tape 2 Black Per Yard
CTAPE - Tape Cork Per Foot
ELECTAPE - Electrical Tape Per Yard
FODT - Duct Tape Foil 2-1/2 UL Per Yard
FTAPE - Tape Foam Per Foot
TTAPE - Tape Teflon Per Foot

[Hardware]
101STSCR - 10 X 1 Self Tapping Screws
812STSCR - 8 X 1/2 Self Tapping Screws
716X1HC - Hose Clamp 7/16 X 1
`;

const TRUCK_STOCK_CATALOG = (() => {
  let currentCat = 'General';
  const items = [];
  RAW_INVENTORY.trim().split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;
    const catMatch = line.match(/^\[(.+)\]$/);
    if (catMatch) {
      currentCat = catMatch.at(1).trim();
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
