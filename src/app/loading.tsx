// Generic page skeleton: a heading block over a grid of empty frames, the shape most
// routes resolve to.
export default function Loading() {
  return (
    <main aria-busy="true">
      <p role="status" className="visually-hidden">
        Loading…
      </p>
      <div className="page-head" aria-hidden="true">
        <span className="skeleton skeleton--title" />
        <span className="skeleton skeleton--line" style={{ width: "60%" }} />
      </div>
      <ul className="card-grid" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i}>
            <span className="skeleton skeleton-frame" />
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line" style={{ width: "50%" }} />
          </li>
        ))}
      </ul>
    </main>
  );
}
