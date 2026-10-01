import "./AdminDashboard.css";

/**
 * Skeleton "UI card" loader for the Admin Dashboard — mirrors the real layout
 * (header, KPI strip, tabs, admin table) so the page doesn't jump when data
 * arrives. Used as the React.lazy/Suspense fallback and while the stats query
 * is in flight.
 */
export default function AdminDashboardSkeleton({
  rows = 6,
}: {
  rows?: number;
}) {
  return (
    <div
      className="admindash app"
      aria-busy="true"
      aria-label="Loading admin dashboard"
    >
      <header className="admindash__header">
        <div>
          <div className="admindash__skl admindash__skl--title" />
          <div className="admindash__skl admindash__skl--sub" />
        </div>
        <div className="admindash__skl admindash__skl--refresh" />
      </header>

      <section className="admindash__kpis">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="admindash__kpi admindash__skl-block">
            <div className="admindash__skl admindash__skl--kpinum" />
            <div className="admindash__skl admindash__skl--kpilabel" />
          </div>
        ))}
      </section>

      <div className="admindash__tabs">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="admindash__skl admindash__skl--tab" />
        ))}
      </div>

      <section className="admindash__table-card">
        <div className="admindash__table-toolbar">
          <div className="admindash__skl admindash__skl--search" />
          <div className="admindash__skl admindash__skl--filter" />
        </div>
        <div className="admindash__rows">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="admindash__row">
              <div className="admindash__skl admindash__skl--rowmain" />
              <div className="admindash__skl admindash__skl--rowmeta" />
              <div className="admindash__skl admindash__skl--rowbadge" />
              <div className="admindash__skl admindash__skl--rowaction" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
