// The nine relationship types the Family Explorer supports (master prompt §4). Every
// value here must trace to a Relationship row backed by a specific citable source —
// never inferred from a matching title, subject, or visual similarity alone.
export const RELATIONSHIP_TYPES = [
  "same_series",
  "preparatory_study",
  "another_version",
  "pendant_companion",
  "multi_part_work",
  "print_impression",
  "cast_from_model",
  "copy_after",
  "documented_influence",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

/**
 * The reader-facing label for a relationship, from the point of view of `viewpoint`
 * ("subject" or "object") — several types read differently depending on which side of
 * the row you're standing on (e.g. "Preparatory study for X" vs. "Has a preparatory
 * study: X").
 */
export function relationshipLabel(type: RelationshipType, viewpoint: "subject" | "object"): string {
  switch (type) {
    case "same_series":
      return "Same series";
    case "preparatory_study":
      return viewpoint === "subject" ? "Preparatory study for" : "Has a preparatory study";
    case "another_version":
      return "Another version by the artist";
    case "pendant_companion":
      return "Pendant or companion work";
    case "multi_part_work":
      return "Part of the same multi-part work";
    case "print_impression":
      return viewpoint === "subject" ? "Print impression from" : "Has a print impression";
    case "cast_from_model":
      return viewpoint === "subject" ? "Cast from" : "Model for a cast";
    case "copy_after":
      return viewpoint === "subject" ? "Copy after" : "Copied by another work";
    case "documented_influence":
      return "Documented influence or response";
  }
}
