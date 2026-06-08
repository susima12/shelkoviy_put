export const ADMIN_PASSWORDS: Record<string, string> = {
  "teatry-mody": "Mod2026",
  "yunyy-modeler": "Yun2026",
  "teatralnye-kollektivy": "Tea2026",
  vokal: "Vok2026",
  horeograph: "Hor2026",
  instrument: "Ins2026",
};

export const ADMIN_HINTS: [string, string, string][] = [
  ["Театры моды", "admin_teatry-mody@festival.local", ADMIN_PASSWORDS["teatry-mody"]],
  ["Юный модельер", "admin_yunyy-modeler@festival.local", ADMIN_PASSWORDS["yunyy-modeler"]],
  ["Театральные коллективы", "admin_teatralnye-kollektivy@festival.local", ADMIN_PASSWORDS["teatralnye-kollektivy"]],
  ["Вокал", "admin_vokal@festival.local", ADMIN_PASSWORDS.vokal],
  ["Хореография", "admin_horeograph@festival.local", ADMIN_PASSWORDS.horeograph],
  ["Инструментальное", "admin_instrument@festival.local", ADMIN_PASSWORDS.instrument],
];
