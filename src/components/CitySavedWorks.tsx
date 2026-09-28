"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PassportEntry } from "@/lib/passport/storage";
import { getAllEntries } from "@/lib/passport/storage";
import ArtworkImage from "@/components/ArtworkImage";

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
        <p>Nothing saved here yet — saved works are stored on this device only.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.artworkSlug}>
              <Link href={`/artwork/${entry.artworkSlug}`}>
                {entry.imageUrl && <ArtworkImage src={entry.imageUrl} alt={entry.imageAlt ?? entry.title} width={100} loading="lazy" />}
                {entry.title}
              </Link>
              {entry.artistName && <> — {entry.artistName}</>}
              {" — "}
              {entry.statuses.join(", ").replace(/_/g, " ")}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
