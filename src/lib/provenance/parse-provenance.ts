/**
 * Splits AIC's `provenance_text` field into discrete, source-ordered segments — one per
 * ownership transfer, in the order the museum's own scholarly research presents them.
 *
 * Splits on top-level semicolons only: a semicolon inside `[...]` or `(...)` is part of a
 * citation aside ("[per Durand-Ruel, Paris, stock book for 1901–13 ...]") or a parenthetical
 * ("(d. 1926)"), not a boundary between owners, and splitting there would cut a citation
 * or a birth/death aside in half. Bracket/paren depth is tracked per character rather
 * than assumed absent — real provenance text nests both.
 *
 * Deliberately does NOT extract owner name, date, or transfer type into separate fields
 * — see the OwnershipEvent model comment in schema.prisma for why (an agent named in the
 * text, "as the agent for Knoedler and Company," is explicitly not the owner; a generic
 * name/date regex would risk misattributing that). Each returned segment is the
 * unmodified source text for that transfer.
 */
export function splitProvenanceSegments(provenanceText: string): string[] {
  const segments: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of provenanceText) {
    if (char === "[" || char === "(") depth++;
    if (char === "]" || char === ")") depth = Math.max(0, depth - 1);

    if (char === ";" && depth === 0) {
      segments.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) segments.push(current.trim());

  return segments.filter((s) => s.length > 0);
}

/**
 * Splits AIC's `exhibition_history` field into discrete entries — one per exhibition, in
 * the source's own order. Each entry is its own blank-line-separated paragraph in the
 * source text (confirmed live against the AIC API), a far more reliable boundary than
 * provenance_text's semicolon-in-prose format, so no bracket-depth tracking is needed
 * here.
 */
export function splitExhibitionSegments(exhibitionHistory: string): string[] {
  return exhibitionHistory
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
