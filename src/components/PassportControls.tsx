"use client";

import { useEffect, useState } from "react";
import type { PassportEntry, PassportStatus } from "@/lib/passport/storage";
import { getEntry, setNote, toggleStatus } from "@/lib/passport/storage";

const STATUS_LABELS: Record<PassportStatus, string> = {
  want_to_see: "Want to see",
  seen: "Seen",
  want_to_understand: "Want to understand",
};

export type ArtworkSnapshot = Omit<PassportEntry, "statuses" | "note" | "savedAt">;

/**
 * Save/remove + private-note controls on the artwork page (ticket 11). Client-only —
 * localStorage isn't available during server render, so `mounted` gates the first paint
 * to avoid a hydration mismatch (server always renders "not saved").
 */
export default function PassportControls({ snapshot }: { snapshot: ArtworkSnapshot }) {
  const [mounted, setMounted] = useState(false);
  const [entry, setEntryState] = useState<PassportEntry | null>(null);

  useEffect(() => {
    setMounted(true);
    setEntryState(getEntry(snapshot.artworkSlug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.artworkSlug]);

  if (!mounted) return null;

  const statuses = entry?.statuses ?? [];

  function handleToggle(status: PassportStatus) {
    toggleStatus(snapshot, status);
    setEntryState(getEntry(snapshot.artworkSlug));
  }

  function handleNoteChange(note: string) {
    // A note only makes sense once the work is saved to at least one list.
    if (!entry) return;
    setNote(snapshot.artworkSlug, note);
    setEntryState(getEntry(snapshot.artworkSlug));
  }

  return (
    <section aria-labelledby="passport-heading">
      <h2 id="passport-heading">My Art Passport</h2>
      <p role="note">Saved on this device only — no account, no sync yet.</p>
      <div role="group" aria-label="Save to Art Passport">
        {(Object.keys(STATUS_LABELS) as PassportStatus[]).map((status) => (
          <label key={status}>
            <input
              type="checkbox"
              checked={statuses.includes(status)}
              onChange={() => handleToggle(status)}
            />
            {STATUS_LABELS[status]}
          </label>
        ))}
      </div>
      {entry && (
        <div>
          <label htmlFor="passport-note">Private note (only visible to you, on this device)</label>
          <textarea
            id="passport-note"
            value={entry.note}
            onChange={(e) => handleNoteChange(e.target.value)}
          />
        </div>
      )}
    </section>
  );
}
