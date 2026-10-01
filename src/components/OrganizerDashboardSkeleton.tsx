
import "./OrganizerDashboard.css";

/**
 * Skeleton "UI card" loader for the Organiser Dashboard.
 * Used both as the React.lazy/Suspense fallback (while the dashboard chunk
 * is downloading) and inside the dashboard while the contests query is in
 * flight — it mirrors the real layout (header, summary cards, contest cards)
 * so the page doesn't jump when data arrives.
 */
export default function OrganizerDashboardSkeleton({ cards = 2 }) {
  return (
    <div
      className="orgdash app"
      aria-busy="true"
      aria-label="Loading organiser dashboard"
    >
      <header className="orgdash__header">
        <div className="orgdash__skl orgdash__skl--back" />
        <div>
          <div className="orgdash__skl orgdash__skl--title" />
          <div className="orgdash__skl orgdash__skl--sub" />
        </div>
        <div className="orgdash__skl orgdash__skl--new" />
      </header>

      <section className="orgdash__summary">
        <div className="orgdash__sumcard orgdash__skl-block">
          <div className="orgdash__skl orgdash__skl--sumnum" />
          <div className="orgdash__skl orgdash__skl--sumlabel" />
        </div>
        <div className="orgdash__sumcard orgdash__skl-block">
          <div className="orgdash__skl orgdash__skl--sumnum" />
          <div className="orgdash__skl orgdash__skl--sumlabel" />
        </div>
        <div className="orgdash__sumcard orgdash__skl-block">
          <div className="orgdash__skl orgdash__skl--sumnum" />
          <div className="orgdash__skl orgdash__skl--sumlabel" />
        </div>
      </section>

      <section className="orgdash__list">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="orgdash__card">
            <div className="orgdash__skl orgdash__skl--cover" />
            <div className="orgdash__card-body">
              <div className="orgdash__skl orgdash__skl--cardtitle" />
              <div className="orgdash__skl orgdash__skl--tagline" />
              <div className="orgdash__card-meta">
                <div className="orgdash__skl orgdash__skl--meta" />
                <div className="orgdash__skl orgdash__skl--meta" />
                <div className="orgdash__skl orgdash__skl--meta orgdash__skl--meta-short" />
                <div className="orgdash__skl orgdash__skl--meta orgdash__skl--meta-short" />
              </div>
              <div className="orgdash__card-actions">
                <div className="orgdash__skl orgdash__skl--action" />
                <div className="orgdash__skl orgdash__skl--action" />
                <div className="orgdash__skl orgdash__skl--action" />
                <div className="orgdash__skl orgdash__skl--action" />
                <div className="orgdash__skl orgdash__skl--action" />
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
