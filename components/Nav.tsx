"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBox from "./SearchBox";

const LINKS = [
  { href: "/", label: "Watchlist", icon: "★" },
  { href: "/screener", label: "Screener", icon: "⚲" },
];

export default function Nav() {
  const path = usePathname();
  const isOn = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          <img src="/icon.svg" alt="" width={26} height={26} />
          <span>Trendradar</span>
        </Link>
        <nav className="toplinks">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isOn(l.href) ? "on" : ""}>{l.label}</Link>
          ))}
        </nav>
        <SearchBox />
      </header>
      <nav className="bottomnav">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={isOn(l.href) ? "on" : ""}>
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
