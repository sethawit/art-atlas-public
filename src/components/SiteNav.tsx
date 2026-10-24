"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/timeline", label: "Timeline" },
  { href: "/map", label: "Map" },
  { href: "/passport", label: "My Art Passport" },
];

/** Primary nav. Client-only so the current section can carry aria-current. */
export default function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
