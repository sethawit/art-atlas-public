import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <header className="page-head">
        <h1>We couldn&apos;t find that page</h1>
        <p className="lede">
          The artwork, artist, or place you&apos;re looking for isn&apos;t in our catalogue,
          or the link may be out of date.
        </p>
      </header>
      <p>
        <Link href="/explore">Search the catalogue</Link> or <Link href="/">go home</Link>.
      </p>
    </main>
  );
}
