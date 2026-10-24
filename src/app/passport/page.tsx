"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArtFrame } from "@/components/ArtImage";
import type { PassportEntry, PassportStatus } from "@/lib/passport/storage";
import { getAllEntries, removeEntry, setNote } from "@/lib/passport/storage";

const STATUS_LABELS: Record<PassportStatus, string> = {
  want_to_see: "Want to see",
  seen: "Seen",
  want_to_understand: "Want to understand",
};
const STATUS_ORDER: PassportStatus[] = ["want_to_see", "seen", "want_to_understand"];

export default function PassportPage() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<PassportEntry[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [artistFilter, setArtistFilter] = useState("");
  const [styleFilter, setStyleFilter] = useState("");

  useEffect(() => {
    setMounted(true);
    setEntries(getAllEntries());
  }, []);

  const { cities, artists, styles } = useMemo(() => {
    const cities = new Set<string>();
    const artists = new Set<string>();
    const styles = new Set<string>();
    for (const e of entries) {
      if (e.city) cities.add(e.city);
      if (e.artistName) artists.add(e.artistName);
      for (const s of e.styles) styles.add(s);
    }
    return { cities: Array.from(cities).sort(), artists: Array.from(artists).sort(), styles: Array.from(styles).sort() };
  }, [entries]);

  const filtered = entries.filter(
    (e) =>
      (!cityFilter || e.city === cityFilter) &&
      (!artistFilter || e.artistName === artistFilter) &&
      (!styleFilter || e.styles.includes(styleFilter))
  );

  function handleNoteChange(slug: string, note: string) {
    setNote(slug, note);
    setEntries(getAllEntries());
  }

  function handleRemove(slug: string) {
    removeEntry(slug);
    setEntries(getAllEntries());
  }

  if (!mounted) return null;

  return (
    <main>
      <header className="page-head">
        <h1>My Art Passport</h1>
        <p role="note" className="lede">
          Saved on this device only. Nothing here is sent anywhere, and it won&apos;t follow
          you to another device or browser. No account, no sync yet.
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="muted">
          Nothing saved yet. Save a work from any artwork page to see it here, or{" "}
          <Link href="/explore">start exploring</Link>.
        </p>
      ) : (
        <>
          <form aria-label="Filter saved works" className="inline-filters">
            <div>
              <label htmlFor="city-filter">City</label>
              <select id="city-filter" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                <option value="">Any</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="artist-filter">Artist</label>
              <select id="artist-filter" value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)}>
                <option value="">Any</option>
                {artists.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="style-filter">Style</label>
              <select id="style-filter" value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)}>
                <option value="">Any</option>
                {styles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {STATUS_ORDER.map((status) => {
            const inList = filtered.filter((e) => e.statuses.includes(status));
            if (inList.length === 0) return null;
            return (
              <section key={status} aria-labelledby={`list-${status}`}>
                <h2 id={`list-${status}`}>
                  {STATUS_LABELS[status]} <span className="count">{inList.length}</span>
                </h2>
                <ul className="card-grid">
                  {inList.map((entry) => (
                    <li key={entry.artworkSlug}>
                      <Link href={`/artwork/${entry.artworkSlug}`}>
                        <ArtFrame src={entry.imageUrl} alt={entry.imageAlt ?? entry.title} />
                        <p>{entry.title}</p>
                      </Link>
                      {entry.artistName && <p>{entry.artistName}</p>}
                      {entry.institutionName && (
                        <p>
                          {entry.institutionSlug ? (
                            <Link href={`/museum/${entry.institutionSlug}`}>{entry.institutionName}</Link>
                          ) : (
                            entry.institutionName
                          )}
                        </p>
                      )}
                      <div>
                        <label htmlFor={`note-${entry.artworkSlug}-${status}`}>Private note</label>
                        <textarea
                          id={`note-${entry.artworkSlug}-${status}`}
                          value={entry.note}
                          onChange={(e) => handleNoteChange(entry.artworkSlug, e.target.value)}
                        />
                      </div>
                      <button type="button" className="button-quiet" onClick={() => handleRemove(entry.artworkSlug)}>
                        Remove from Art Passport
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
