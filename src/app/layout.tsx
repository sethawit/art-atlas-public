import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Newsreader } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const body = Newsreader({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  // Needed so relative URLs (e.g. the artwork page's og:image, which points at our own
  // AIC image proxy — see src/app/api/image-proxy) resolve to an absolute URL in
  // rendered meta tags. VERCEL_PROJECT_PRODUCTION_URL is bare-domain (no protocol) per
  // Vercel's own convention.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"
  ),
  title: { default: "Art Atlas", template: "%s — Art Atlas" },
  description: "Discover an artwork. Understand its connections. Find where to see it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <span className="site-header__brand">
            <Link href="/" className="site-header__wordmark">
              Art Atlas
            </Link>
            <span className="site-header__tagline">a field guide to painted places</span>
          </span>
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
