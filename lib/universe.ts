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
  "ORA.PA": "Telekommunikation", "TEF.MC": "Telekommunikation", "VOD.L": "Telekommunikation", "KPN.AS": "Telekommunikation",
  "LEG.DE": "Immobilien", "PUB.PA": "Medien & Unterhaltung", "WPP.L": "Medien & Unterhaltung",
};

// US-Sektor-ETFs (Select Sector SPDRs + Halbleiter/Rüstung) mit deutscher Sektorbezeichnung
export const SECTOR_ETFS: Record<string, string> = {
  XLK: "Technologie",
  XLC: "Kommunikation & Medien",
  XLY: "Zyklischer Konsum",
  XLP: "Basiskonsum",
  XLF: "Finanzen",
  XLV: "Gesundheit",
  XLI: "Industrie (ETF)",
  XLE: "Energie",
  XLB: "Grundstoffe",
  XLU: "Versorger (ETF)",
  XLRE: "Immobilien (ETF)",
  SMH: "Halbleiter (ETF)",
  ITA: "Rüstung & Luftfahrt (ETF)",
};

/** Passender Sektor-ETF zu jedem Aktien-Sektor. */
export const ETF_FOR_SECTOR: Record<Sector, string> = {
  "Halbleiter": "SMH",
  "Software & IT": "XLK",
  "Internet & Plattformen": "XLC",
  "Hardware & Netzwerk": "XLK",
  "Rüstung & Luftfahrt": "ITA",
  "Industrie": "XLI",
  "Automobil": "XLY",
  "Banken & Finanzen": "XLF",
  "Versicherungen": "XLF",
  "Gesundheit & Pharma": "XLV",
  "Konsum & Handel": "XLP",
  "Energie (Öl & Gas)": "XLE",
  "Versorger": "XLU",
  "Chemie & Rohstoffe": "XLB",
  "Telekommunikation": "XLC",
  "Immobilien": "XLRE",
  "Medien & Unterhaltung": "XLC",
};

// Europäische Sektor-ETFs: iShares STOXX Europe 600 (Xetra)
export const EU_SECTOR_ETFS: Record<string, string> = {
  "EXV1.DE": "Europa Banken",
  "EXH5.DE": "Europa Versicherungen",
  "EXH2.DE": "Europa Finanzdienstleister",
  "EXV3.DE": "Europa Technologie",
  "EXV4.DE": "Europa Gesundheit",
  "EXV5.DE": "Europa Automobil",
  "EXH4.DE": "Europa Industrie",
  "EXV8.DE": "Europa Bau & Baustoffe",
  "EXV7.DE": "Europa Chemie",
  "EXV6.DE": "Europa Rohstoffe",
  "EXH1.DE": "Europa Öl & Gas",
  "EXH9.DE": "Europa Versorger",
  "EXV2.DE": "Europa Telekom",
  "EXH6.DE": "Europa Medien",
  "EXH3.DE": "Europa Nahrungsmittel & Getränke",
  "EXH7.DE": "Europa Konsumgüter",
  "EXH8.DE": "Europa Einzelhandel",
  "EXV9.DE": "Europa Reise & Freizeit",
  "EXI5.DE": "Europa Immobilien",
};

// Ersatz, falls Yahoo keine Positionen liefert: Aktien aus unseren Listen mit passendem Sektor
const ETF_FALLBACK: Record<string, { sectors: Sector[]; markets: ("de" | "us" | "eu")[] }> = {
  XLK: { sectors: ["Software & IT", "Hardware & Netzwerk", "Halbleiter"], markets: ["us"] },
  XLC: { sectors: ["Internet & Plattformen", "Telekommunikation", "Medien & Unterhaltung"], markets: ["us"] },
  XLY: { sectors: ["Automobil", "Konsum & Handel", "Internet & Plattformen"], markets: ["us"] },
  XLP: { sectors: ["Konsum & Handel"], markets: ["us"] },
  XLF: { sectors: ["Banken & Finanzen", "Versicherungen"], markets: ["us"] },
  XLV: { sectors: ["Gesundheit & Pharma"], markets: ["us"] },
  XLI: { sectors: ["Industrie", "Rüstung & Luftfahrt"], markets: ["us"] },
  XLE: { sectors: ["Energie (Öl & Gas)"], markets: ["us"] },
  XLB: { sectors: ["Chemie & Rohstoffe"], markets: ["us"] },
  XLU: { sectors: ["Versorger"], markets: ["us"] },
  XLRE: { sectors: ["Immobilien"], markets: ["us"] },
  SMH: { sectors: ["Halbleiter"], markets: ["us", "eu", "de"] },
  ITA: { sectors: ["Rüstung & Luftfahrt"], markets: ["us"] },
  "EXV1.DE": { sectors: ["Banken & Finanzen"], markets: ["de", "eu"] },
  "EXH5.DE": { sectors: ["Versicherungen"], markets: ["de", "eu"] },
  "EXH2.DE": { sectors: ["Banken & Finanzen"], markets: ["de", "eu"] },
  "EXV3.DE": { sectors: ["Software & IT", "Halbleiter", "Hardware & Netzwerk"], markets: ["de", "eu"] },
  "EXV4.DE": { sectors: ["Gesundheit & Pharma"], markets: ["de", "eu"] },
  "EXV5.DE": { sectors: ["Automobil"], markets: ["de", "eu"] },
  "EXH4.DE": { sectors: ["Industrie", "Rüstung & Luftfahrt"], markets: ["de", "eu"] },
  "EXV8.DE": { sectors: ["Chemie & Rohstoffe", "Industrie"], markets: ["de", "eu"] },
  "EXV7.DE": { sectors: ["Chemie & Rohstoffe"], markets: ["de", "eu"] },
  "EXV6.DE": { sectors: ["Chemie & Rohstoffe"], markets: ["de", "eu"] },
  "EXH1.DE": { sectors: ["Energie (Öl & Gas)"], markets: ["de", "eu"] },
  "EXH9.DE": { sectors: ["Versorger"], markets: ["de", "eu"] },
  "EXV2.DE": { sectors: ["Telekommunikation"], markets: ["de", "eu"] },
  "EXH6.DE": { sectors: ["Medien & Unterhaltung"], markets: ["de", "eu"] },
  "EXH3.DE": { sectors: ["Konsum & Handel"], markets: ["de", "eu"] },
  "EXH7.DE": { sectors: ["Konsum & Handel"], markets: ["de", "eu"] },
  "EXH8.DE": { sectors: ["Konsum & Handel"], markets: ["de", "eu"] },
  "EXV9.DE": { sectors: ["Konsum & Handel"], markets: ["de", "eu"] },
  "EXI5.DE": { sectors: ["Immobilien"], markets: ["de", "eu"] },
};

export type UniverseId = "de" | "us" | "eu" | "all" | "etf" | "etfeu";

const SECTOR_OF: Record<string, string> = { ...DE, ...US, ...EU, ...SECTOR_ETFS, ...EU_SECTOR_ETFS };

export const UNIVERSES: Record<UniverseId, { name: string; symbols: string[] }> = {
  all: { name: "Alle Märkte (Aktien)", symbols: Object.keys({ ...DE, ...US, ...EU }).filter((s) => s !== "AIR.PA") },
  de: { name: "Deutschland (DAX-Werte)", symbols: Object.keys(DE) },
  us: { name: "USA (Large Caps)", symbols: Object.keys(US) },
  eu: { name: "Europa (Large Caps)", symbols: Object.keys(EU).filter((s) => s !== "AIR.PA") },
  etf: { name: "Sektor-ETFs USA (XLK, XLF, XLRE …)", symbols: Object.keys(SECTOR_ETFS) },
  etfeu: { name: "Sektor-ETFs Europa (STOXX 600)", symbols: Object.keys(EU_SECTOR_ETFS) },
};

export const ALL_SYMBOLS = [...UNIVERSES.all.symbols, ...UNIVERSES.etf.symbols, ...UNIVERSES.etfeu.symbols];

export const isKnownEtf = (s: string) => s in SECTOR_ETFS || s in EU_SECTOR_ETFS;
export const etfName = (s: string) => SECTOR_ETFS[s] ?? EU_SECTOR_ETFS[s] ?? s;

/** Ersatz-Positionen eines Sektor-ETFs aus den eigenen Listen. */
export function fallbackHoldings(etf: string): string[] {
  const f = ETF_FALLBACK[etf];
  if (!f) return [];
  const lists = { de: DE, us: US, eu: EU };
  return f.markets.flatMap((m) => Object.entries(lists[m]).filter(([, sec]) => f.sectors.includes(sec)).map(([sym]) => sym)).filter((s) => s !== "AIR.PA");
}

/** Sektor eines Symbols (bei ETFs der abgebildete Sektor); unbekannte (z. B. eigene Watchlist-Werte) → "Sonstige". */
export function sectorOf(symbol: string): string {
  return SECTOR_OF[symbol] ?? "Sonstige";
}

/** Reihenfolge der Sektoren für Auswahllisten. */
export const SECTOR_ORDER: string[] = [...SECTORS, ...Object.values(SECTOR_ETFS), ...Object.values(EU_SECTOR_ETFS), "Sonstige"];
