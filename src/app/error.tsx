"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <header className="page-head">
        <h1>Something went wrong loading this page</h1>
        <p role="alert" className="lede">
          This is usually temporary: the database or an external request didn&apos;t
          respond. Nothing you did caused this.
        </p>
      </header>
      <p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>{" "}
        or <Link href="/">go home</Link>.
      </p>
    </main>
  );
}
