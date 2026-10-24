// Mirrors the artwork page's top split (details rail beside the plate) so the layout
// doesn't jump when the record arrives.
export default function Loading() {
  return (
    <main aria-busy="true">
      <p role="status" className="visually-hidden">
        Loading artwork…
      </p>
      <div className="artwork-top" aria-hidden="true">
        <div className="artwork-aside">
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--line" style={{ width: "70%" }} />
          <span className="skeleton skeleton--line" style={{ width: "40%" }} />
        </div>
        <div className="plate">
          <span className="skeleton skeleton-frame" />
        </div>
      </div>
    </main>
  );
}
