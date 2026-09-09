import { beforeEach, describe, expect, it } from "vitest";
import { getAllEntries, getEntry, removeEntry, setNote, toggleStatus } from "@/lib/passport/storage";

// This module runs client-side only; the test suite's default environment has no DOM, so
// a minimal in-memory localStorage stand-in is enough to exercise the pure logic without
// pulling in a jsdom dependency just for this.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

const snapshot = {
  artworkSlug: "the-bedroom",
  title: "The Bedroom",
  artistName: "Vincent van Gogh",
  artistSlug: "vincent-van-gogh",
  imageUrl: "https://example.org/bedroom.jpg",
  imageAlt: "The Bedroom",
  institutionName: "The Art Institute of Chicago",
  institutionSlug: "art-institute-of-chicago",
  city: "Chicago",
  styles: ["Post-Impressionism"],
};

describe("passport storage", () => {
  it("creates an entry with the given status on first toggle", () => {
    toggleStatus(snapshot, "want_to_see");
    const entry = getEntry("the-bedroom");
    expect(entry?.statuses).toEqual(["want_to_see"]);
    expect(entry?.title).toBe("The Bedroom");
    expect(entry?.note).toBe("");
  });

  it("adds a second status without removing the first — a work can be in multiple lists", () => {
    toggleStatus(snapshot, "want_to_see");
    toggleStatus(snapshot, "seen");
    const entry = getEntry("the-bedroom");
    expect(entry?.statuses.sort()).toEqual(["seen", "want_to_see"].sort());
  });

  it("toggling an active status off removes just that status", () => {
    toggleStatus(snapshot, "want_to_see");
    toggleStatus(snapshot, "seen");
    toggleStatus(snapshot, "want_to_see");
    const entry = getEntry("the-bedroom");
    expect(entry?.statuses).toEqual(["seen"]);
  });

  it("removes the entry entirely when its last status is toggled off", () => {
    toggleStatus(snapshot, "want_to_see");
    toggleStatus(snapshot, "want_to_see");
    expect(getEntry("the-bedroom")).toBeNull();
  });

  it("attaches a private note to a saved work", () => {
    toggleStatus(snapshot, "seen");
    setNote("the-bedroom", "Saw this in person, the brushwork is incredible.");
    const entry = getEntry("the-bedroom");
    expect(entry?.note).toBe("Saw this in person, the brushwork is incredible.");
  });

  it("setNote on an artwork with no entry is a no-op, not a crash", () => {
    expect(() => setNote("nonexistent-slug", "hello")).not.toThrow();
    expect(getAllEntries()).toEqual([]);
  });

  it("removeEntry deletes the whole entry regardless of how many statuses it has", () => {
    toggleStatus(snapshot, "seen");
    toggleStatus(snapshot, "want_to_understand");
    removeEntry("the-bedroom");
    expect(getEntry("the-bedroom")).toBeNull();
  });

  it("returns an empty list when localStorage is empty", () => {
    expect(getAllEntries()).toEqual([]);
  });

  it("degrades to an empty list rather than throwing when localStorage.getItem throws", () => {
    (globalThis as unknown as { localStorage: { getItem: () => never } }).localStorage = {
      getItem: () => {
        throw new Error("storage disabled");
      },
    };
    expect(() => getAllEntries()).not.toThrow();
    expect(getAllEntries()).toEqual([]);
  });
});
