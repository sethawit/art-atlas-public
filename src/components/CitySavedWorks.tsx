"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArtFrame } from "@/components/ArtImage";
import type { PassportEntry } from "@/lib/passport/storage";
import { getAllEntries } from "@/lib/passport/storage";

/** Saved works filtered to one city (ticket 11's tie-in to ticket 10's city page). Client-only, same reason as PassportControls. */
export default function CitySavedWorks({ cityName }: { cityName: string }) {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<PassportEntry[]>([]);

  useEffect(() => {
    setMounted(true);
    setEntries(getAllEntries().filter((e) => e.city === cityName));
  }, [cityName]);

  if (!mounted) return null;

  return (
    <section aria-labelledby="saved-heading">
      <h2 id="saved-heading">Your saved works in {cityName}</h2>
      {entries.length === 0 ? (
        <p className="muted">Nothing saved here yet. Saved works are stored on this device only.</p>
      ) : (
        <ul className="card-grid card-grid--compact">
          {entries.map((entry) => (
            <li key={entry.artworkSlug}>
              <Link href={`/artwork/${entry.artworkSlug}`}>
                <ArtFrame src={entry.imageUrl} alt={entry.imageAlt ?? entry.title} />
                <p>{entry.title}</p>
              </Link>
              {entry.artistName && <p>{entry.artistName}</p>}
              <p>{entry.statuses.join(", ").replace(/_/g, " ")}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
