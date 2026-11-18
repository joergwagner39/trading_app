"use client";
import { useEffect, useRef, useState } from "react";

// Yahoo-Suffix → TradingView-Börsenpräfix
const EXCHANGES: Record<string, string> = {
  DE: "XETR", F: "FWB", AS: "EURONEXT", PA: "EURONEXT", BR: "EURONEXT", LS: "EURONEXT",
  L: "LSE", SW: "SIX", MI: "MIL", MC: "BME", CO: "OMXCOP", ST: "OMXSTO", HE: "OMXHEX",
  OL: "OSL", VI: "VIE", TO: "TSX", HK: "HKEX", T: "TSE",
};

/** Wandelt ein Yahoo-Symbol (z. B. SAP.DE, BRK-B, NOVO-B.CO) in ein TradingView-Symbol um. */
export function toTradingViewSymbol(yahoo: string): string {
  const [base, suffix] = yahoo.split(".");
  if (suffix && EXCHANGES[suffix]) return `${EXCHANGES[suffix]}:${base.replace(/-/g, "_")}`;
  if (!suffix) return base.replace(/-/g, "."); // US: BRK-B → BRK.B
  return yahoo;
}

export default function TradingViewChart({ symbol }: { symbol: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const on = () => setDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const host = el.current;
    if (!host) return;
    host.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    s.async = true;
    s.type = "text/javascript";
    s.innerHTML = JSON.stringify({
      autosize: true,
      symbol: toTradingViewSymbol(symbol),
      interval: "D",
      timezone: "Europe/Berlin",
      theme: dark ? "dark" : "light",
      style: "1",
      locale: "de_DE",
      backgroundColor: dark ? "#161a21" : "#ffffff",
      allow_symbol_change: true,
      hide_side_toolbar: false,
      calendar: false,
      studies: ["STD;RSI", "STD;MACD"],
      support_host: "https://www.tradingview.com",
    });
    host.appendChild(s);
    return () => {
      host.innerHTML = "";
    };
  }, [symbol, dark]);

  return <div ref={el} className="tradingview-widget-container tv-chart" />;
}
