// Shown while a route segment streams. Most pages are pre-rendered, so this
// mostly covers client-side navigations and the heavier grids.

export default function Loading() {
  return (
    <div className="wrap" aria-busy="true" aria-live="polite">
      <div className="loadBlock">
        <span className="loadBar"></span>
        <span className="loadBar short"></span>
      </div>
      <div className="loadGrid">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="loadCard"></span>
        ))}
      </div>
    </div>
  );
}
