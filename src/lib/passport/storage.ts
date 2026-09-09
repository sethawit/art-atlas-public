// Art Passport (ticket 11) — local, account-free saved lists. Deliberately NOT a
// database table: the product spec is explicit that Phase 1 saved lists stay on the
// user's device, no account sync, and the UI must disclose that (§3, §5 "My Art
// Passport"). One entry per artwork; an artwork can be in more than one list at once
// (e.g. both "Seen" and "Want to understand"). Wrapped in try/catch throughout —
// localStorage can throw (private browsing, disabled storage) and a saved-list feature
// failing silently is much better than it crashing the page.

export type PassportStatus = "want_to_see" | "seen" | "want_to_understand";

export interface PassportEntry {
  artworkSlug: string;
  title: string;
  artistName: string | null;
  artistSlug: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  institutionName: string | null;
  institutionSlug: string | null;
  city: string | null;
  styles: string[];
  statuses: PassportStatus[];
  note: string;
  savedAt: string;
}

const STORAGE_KEY = "art-atlas:passport:v1";

function readAll(): PassportEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: PassportEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage unavailable or full — the save silently doesn't persist rather than
    // throwing and breaking the page. Nothing further to do here.
  }
}

export function getAllEntries(): PassportEntry[] {
  return readAll();
}

export function getEntry(artworkSlug: string): PassportEntry | null {
  return readAll().find((e) => e.artworkSlug === artworkSlug) ?? null;
}

/** Toggle one status on/off for an artwork. Creates the entry (with snapshot data) if it doesn't exist yet. */
export function toggleStatus(
  snapshot: Omit<PassportEntry, "statuses" | "note" | "savedAt">,
  status: PassportStatus
): PassportEntry[] {
  const entries = readAll();
  const existingIndex = entries.findIndex((e) => e.artworkSlug === snapshot.artworkSlug);

  if (existingIndex === -1) {
    entries.push({ ...snapshot, statuses: [status], note: "", savedAt: new Date().toISOString() });
  } else {
    const existing = entries[existingIndex];
    const hasStatus = existing.statuses.includes(status);
    const nextStatuses = hasStatus ? existing.statuses.filter((s) => s !== status) : [...existing.statuses, status];
    if (nextStatuses.length === 0) {
      entries.splice(existingIndex, 1);
    } else {
      entries[existingIndex] = { ...existing, statuses: nextStatuses };
    }
  }

  writeAll(entries);
  return entries;
}

export function setNote(artworkSlug: string, note: string): PassportEntry[] {
  const entries = readAll();
  const index = entries.findIndex((e) => e.artworkSlug === artworkSlug);
  if (index !== -1) {
    entries[index] = { ...entries[index], note };
    writeAll(entries);
  }
  return entries;
}

export function removeEntry(artworkSlug: string): PassportEntry[] {
  const entries = readAll().filter((e) => e.artworkSlug !== artworkSlug);
  writeAll(entries);
  return entries;
}
