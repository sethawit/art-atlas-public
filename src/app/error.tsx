"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <h1>Something went wrong loading this page</h1>
      <p role="alert">
        This is usually temporary — the database or an external request didn&apos;t
        respond. Nothing you did caused this.
      </p>
      <p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>{" "}
        or <Link href="/">go home</Link>.
      </p>
    </main>
  );
}
