import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div role="status">
        <strong>Admin area — HTTP Basic Auth protected</strong> (ticket 19). A single
        shared password, set via <code>ADMIN_PASSWORD</code>, gates every page here and
        the Server Actions they call — proportional to a single-operator MVP, not a full
        user/roles system.
      </div>
      <nav>
        <a href="/admin">Dashboard</a> · <a href="/admin/duplicates">Duplicate flags</a>
      </nav>
      {children}
    </div>
  );
}
