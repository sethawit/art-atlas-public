import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

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
  title: { default: "Art Atlas", template: "%s · Art Atlas" },
  description: "Discover an artwork. Understand its connections. Find where to see it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <div className="site-header__inner">
            <span className="site-header__brand">
              <Link href="/" className="site-header__wordmark">
                Art Atlas
              </Link>
              <span className="site-header__tagline">a field guide to painted places</span>
            </span>
            <SiteNav />
            <form action="/explore" className="site-header__search" role="search">
              <label htmlFor="site-search" className="visually-hidden">
                Search by artwork or artist
              </label>
              <input id="site-search" name="q" type="search" placeholder="Search artwork or artist" />
            </form>
          </div>
        </header>
        <div id="main">{children}</div>
        <footer className="site-footer">
          <div className="site-footer__inner">
            <p>Art Atlas. Open-access records from the Met, the Art Institute of Chicago, and the Cleveland Museum of Art.</p>
            <p>Sources are listed on every artwork page.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
