export interface ParsedBio {
  nationality: string | null;
  lifespanYears: string | null;
  raw: string;
}

/**
 * Best-effort, conservative extraction from the Met's artistDisplayBio text (ticket 08).
 * The format is NOT fully uniform across records — confirmed live variants include
 * "Dutch, Zundert 1853–1890 Auvers-sur-Oise", "Netherlandish, active ca. 1460–95", and
 * "Netherlandish, Seligenstadt, active by 1465–died 1494 Bruges". Rather than build a
 * parser that guesses at birthplace/deathplace across all these shapes (real risk of
 * mislabeling — e.g. treating "active" as a place), this only extracts the two things
 * reliably present across every variant seen: the leading nationality word, and a clean
 * four-digit–four-digit year range when one exists. Anything it can't confidently
 * extract stays null — the raw text is always kept so nothing is lost, just not
 * mis-structured.
 */
export function parseArtistBio(bio: string): ParsedBio {
  const nationalityMatch = bio.match(/^([A-Za-z]+)/);
  const yearRangeMatch = bio.match(/(\d{4})\s*[–-]\s*(\d{4})/);
  return {
    nationality: nationalityMatch ? nationalityMatch[1] : null,
    lifespanYears: yearRangeMatch ? `${yearRangeMatch[1]}–${yearRangeMatch[2]}` : null,
    raw: bio,
  };
}
