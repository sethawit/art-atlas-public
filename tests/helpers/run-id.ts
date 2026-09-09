/**
 * A per-test-file id used to tag fixture rows so they're identifiable and (where a file
 * cleans up) removable. `Date.now().toString(36)` alone isn't collision-proof — vitest can
 * load multiple test files within the same millisecond, and a real collision between two
 * files' runIds caused a live cross-test foreign-key failure (write-normalized-artwork.test.ts
 * lost its Institution row to another file's cleanup). Adding a random suffix makes
 * collision astronomically unlikely without changing how any test uses the value.
 */
export function newRunId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
