import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div role="alert">
        <strong>Unauthenticated admin area.</strong> No access control exists in Phase 1
        (see docs/adr and .scratch/art-atlas-mvp/issues/05-bulk-ingest-admin-review.md) —
        do not deploy this publicly without adding auth first.
      </div>
      <nav>
        <a href="/admin">Dashboard</a> · <a href="/admin/duplicates">Duplicate flags</a>
      </nav>
      {children}
    </div>
  );
}
