// Aktienlisten und Sektoren für den Screener (Yahoo-Finance-Symbole).
// Die Zusammensetzung echter Indizes ändert sich; die Listen hier bei Bedarf anpassen.

export const SECTORS = [
  "Halbleiter",
  "Software & IT",
  "Internet & Plattformen",
  "Hardware & Netzwerk",
  "Rüstung & Luftfahrt",
  "Industrie",
  "Automobil",
  "Banken & Finanzen",
  "Versicherungen",
  "Gesundheit & Pharma",
  "Konsum & Handel",
  "Energie (Öl & Gas)",
  "Versorger",
  "Chemie & Rohstoffe",
  "Telekommunikation",
  "Immobilien",
  "Medien & Unterhaltung",
] as const;

export type Sector = (typeof SECTORS)[number];

const DE: Record<string, Sector> = {
  "ADS.DE": "Konsum & Handel", "AIR.DE": "Rüstung & Luftfahrt", "ALV.DE": "Versicherungen", "BAS.DE": "Chemie & Rohstoffe",
  "BAYN.DE": "Gesundheit & Pharma", "BEI.DE": "Konsum & Handel", "BMW.DE": "Automobil", "BNR.DE": "Chemie & Rohstoffe",
  "CBK.DE": "Banken & Finanzen", "CON.DE": "Automobil", "DB1.DE": "Banken & Finanzen", "DBK.DE": "Banken & Finanzen",
  "DHL.DE": "Industrie", "DTE.DE": "Telekommunikation", "DTG.DE": "Automobil", "ENR.DE": "Industrie",
  "EOAN.DE": "Versorger", "FRE.DE": "Gesundheit & Pharma", "G1A.DE": "Industrie", "HEI.DE": "Chemie & Rohstoffe",
  "HEN3.DE": "Konsum & Handel", "HNR1.DE": "Versicherungen", "IFX.DE": "Halbleiter", "MBG.DE": "Automobil",
  "MRK.DE": "Gesundheit & Pharma", "MTX.DE": "Rüstung & Luftfahrt", "MUV2.DE": "Versicherungen", "P911.DE": "Automobil",
  "QIA.DE": "Gesundheit & Pharma", "RHM.DE": "Rüstung & Luftfahrt", "RWE.DE": "Versorger", "SAP.DE": "Software & IT",
  "SHL.DE": "Gesundheit & Pharma", "SIE.DE": "Industrie", "SRT3.DE": "Gesundheit & Pharma", "SY1.DE": "Chemie & Rohstoffe",
  "VNA.DE": "Immobilien", "VOW3.DE": "Automobil", "ZAL.DE": "Konsum & Handel", "HAG.DE": "Rüstung & Luftfahrt",
  "R3NK.DE": "Rüstung & Luftfahrt",
};

const US: Record<string, Sector> = {
  AAPL: "Hardware & Netzwerk", MSFT: "Software & IT", NVDA: "Halbleiter", AMZN: "Internet & Plattformen",
  GOOGL: "Internet & Plattformen", META: "Internet & Plattformen", TSLA: "Automobil", AVGO: "Halbleiter",
  "BRK-B": "Banken & Finanzen", JPM: "Banken & Finanzen", V: "Banken & Finanzen", MA: "Banken & Finanzen",
  LLY: "Gesundheit & Pharma", UNH: "Gesundheit & Pharma", XOM: "Energie (Öl & Gas)", JNJ: "Gesundheit & Pharma",
  WMT: "Konsum & Handel", PG: "Konsum & Handel", HD: "Konsum & Handel", COST: "Konsum & Handel",
  ORCL: "Software & IT", NFLX: "Medien & Unterhaltung", AMD: "Halbleiter", CRM: "Software & IT",
  ADBE: "Software & IT", PEP: "Konsum & Handel", KO: "Konsum & Handel", MRK: "Gesundheit & Pharma",
  ABBV: "Gesundheit & Pharma", CVX: "Energie (Öl & Gas)", BAC: "Banken & Finanzen", TMO: "Gesundheit & Pharma",
  CSCO: "Hardware & Netzwerk", MCD: "Konsum & Handel", INTC: "Halbleiter", QCOM: "Halbleiter",
  TXN: "Halbleiter", AMAT: "Halbleiter", IBM: "Software & IT", GE: "Rüstung & Luftfahrt",
  CAT: "Industrie", DIS: "Medien & Unterhaltung", NKE: "Konsum & Handel", PLTR: "Software & IT",
  UBER: "Internet & Plattformen", PYPL: "Banken & Finanzen", SHOP: "Internet & Plattformen", MU: "Halbleiter",
  PANW: "Software & IT", NOW: "Software & IT", ISRG: "Gesundheit & Pharma", BKNG: "Internet & Plattformen",
  GS: "Banken & Finanzen", MS: "Banken & Finanzen", LIN: "Chemie & Rohstoffe", HON: "Industrie",
  BA: "Rüstung & Luftfahrt", CRWD: "Software & IT", ANET: "Hardware & Netzwerk", LRCX: "Halbleiter",
  LMT: "Rüstung & Luftfahrt", RTX: "Rüstung & Luftfahrt", NOC: "Rüstung & Luftfahrt", GD: "Rüstung & Luftfahrt",
  TSM: "Halbleiter", NEE: "Versorger", PLD: "Immobilien", T: "Telekommunikation", FCX: "Chemie & Rohstoffe",
};

const EU: Record<string, Sector> = {
  "ASML.AS": "Halbleiter", "MC.PA": "Konsum & Handel", "NOVO-B.CO": "Gesundheit & Pharma", "NESN.SW": "Konsum & Handel",
  "ROG.SW": "Gesundheit & Pharma", "NOVN.SW": "Gesundheit & Pharma", "SAN.PA": "Gesundheit & Pharma", "TTE.PA": "Energie (Öl & Gas)",
  "OR.PA": "Konsum & Handel", "SU.PA": "Industrie", "AZN.L": "Gesundheit & Pharma", "SHEL.L": "Energie (Öl & Gas)",
  "HSBA.L": "Banken & Finanzen", "ULVR.L": "Konsum & Handel", "ITX.MC": "Konsum & Handel", "SAN.MC": "Banken & Finanzen",
  "ENEL.MI": "Versorger", "ISP.MI": "Banken & Finanzen", "RACE.MI": "Automobil", "AI.PA": "Chemie & Rohstoffe",
  "RMS.PA": "Konsum & Handel", "UBSG.SW": "Banken & Finanzen", "ABBN.SW": "Industrie", "INGA.AS": "Banken & Finanzen",
  "BBVA.MC": "Banken & Finanzen", "BNP.PA": "Banken & Finanzen", "SAF.PA": "Rüstung & Luftfahrt", "REL.L": "Medien & Unterhaltung",
  "RIO.L": "Chemie & Rohstoffe", "ADYEN.AS": "Banken & Finanzen", "BA.L": "Rüstung & Luftfahrt", "LDO.MI": "Rüstung & Luftfahrt",
  "STMPA.PA": "Halbleiter", "IBE.MC": "Versorger", "BP.L": "Energie (Öl & Gas)", "AIR.PA": "Rüstung & Luftfahrt",
};

export type UniverseId = "de" | "us" | "eu" | "all";

const SECTOR_OF: Record<string, Sector> = { ...DE, ...US, ...EU };

export const UNIVERSES: Record<UniverseId, { name: string; symbols: string[] }> = {
  all: { name: "Alle Märkte", symbols: Object.keys(SECTOR_OF).filter((s) => s !== "AIR.PA") },
  de: { name: "Deutschland (DAX-Werte)", symbols: Object.keys(DE) },
  us: { name: "USA (Large Caps)", symbols: Object.keys(US) },
  eu: { name: "Europa (Large Caps)", symbols: Object.keys(EU).filter((s) => s !== "AIR.PA") },
};

export const ALL_SYMBOLS = UNIVERSES.all.symbols;

/** Sektor eines Symbols; unbekannte (z. B. eigene Watchlist-Werte) → "Sonstige". */
export function sectorOf(symbol: string): Sector | "Sonstige" {
  return SECTOR_OF[symbol] ?? "Sonstige";
}
