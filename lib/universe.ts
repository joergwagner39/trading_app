// Aktienlisten für den Screener (Yahoo-Finance-Symbole).
// Die Zusammensetzung echter Indizes ändert sich; die Listen hier bei Bedarf anpassen.

export type UniverseId = "de" | "us" | "eu";

export const UNIVERSES: Record<UniverseId, { name: string; symbols: string[] }> = {
  de: {
    name: "Deutschland (DAX-Werte)",
    symbols: [
      "ADS.DE", "AIR.DE", "ALV.DE", "BAS.DE", "BAYN.DE", "BEI.DE", "BMW.DE", "BNR.DE",
      "CBK.DE", "CON.DE", "DB1.DE", "DBK.DE", "DHL.DE", "DTE.DE", "DTG.DE", "ENR.DE",
      "EOAN.DE", "FRE.DE", "G1A.DE", "HEI.DE", "HEN3.DE", "HNR1.DE", "IFX.DE", "MBG.DE",
      "MRK.DE", "MTX.DE", "MUV2.DE", "P911.DE", "QIA.DE", "RHM.DE", "RWE.DE", "SAP.DE",
      "SHL.DE", "SIE.DE", "SRT3.DE", "SY1.DE", "VNA.DE", "VOW3.DE", "ZAL.DE", "HAG.DE",
    ],
  },
  us: {
    name: "USA (Large Caps)",
    symbols: [
      "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "BRK-B", "JPM",
      "V", "MA", "LLY", "UNH", "XOM", "JNJ", "WMT", "PG", "HD", "COST", "ORCL", "NFLX",
      "AMD", "CRM", "ADBE", "PEP", "KO", "MRK", "ABBV", "CVX", "BAC", "TMO", "CSCO",
      "MCD", "INTC", "QCOM", "TXN", "AMAT", "IBM", "GE", "CAT", "DIS", "NKE", "PLTR",
      "UBER", "PYPL", "SHOP", "MU", "PANW", "NOW", "ISRG", "BKNG", "GS", "MS", "LIN",
      "HON", "BA", "CRWD", "ANET", "LRCX",
    ],
  },
  eu: {
    name: "Europa (Large Caps)",
    symbols: [
      "ASML.AS", "MC.PA", "NOVO-B.CO", "NESN.SW", "ROG.SW", "NOVN.SW", "SAN.PA", "TTE.PA",
      "OR.PA", "SU.PA", "AZN.L", "SHEL.L", "HSBA.L", "ULVR.L", "ITX.MC", "SAN.MC",
      "ENEL.MI", "ISP.MI", "RACE.MI", "AI.PA", "RMS.PA", "UBSG.SW", "ABBN.SW", "INGA.AS",
      "BBVA.MC", "BNP.PA", "SAF.PA", "REL.L", "RIO.L", "ADYEN.AS",
    ],
  },
};

export const ALL_SYMBOLS = Array.from(new Set(Object.values(UNIVERSES).flatMap((u) => u.symbols)));
