import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Libre_Franklin, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const heading = Libre_Franklin({ subsets: ["latin"], variable: "--font-heading", weight: ["500", "600", "700"] });
const body = Source_Serif_4({ subsets: ["latin"], variable: "--font-body", weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Art Atlas",
  description: "Discover an artwork. Understand its connections. Find where to see it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <Link href="/" className="site-header__wordmark">
            Art Atlas
          </Link>
          <nav aria-label="Primary">
            <Link href="/explore">Explore</Link>
            <Link href="/timeline">Timeline</Link>
            <Link href="/map">Map</Link>
            <Link href="/passport">My Art Passport</Link>
          </nav>
          <form action="/explore" className="site-header__search" role="search">
            <label htmlFor="site-search" className="visually-hidden">
              Search by artwork or artist
            </label>
            <input id="site-search" name="q" type="search" placeholder="Search artwork or artist" />
          </form>
        </header>
        <div id="main">{children}</div>
      </body>
    </html>
  );
}
