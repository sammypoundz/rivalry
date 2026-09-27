import { useEffect, useState } from "react";
import type { Contest, Contestant } from "../data";
import { ChevronLeft, ChevronRight, Users, Search } from "lucide-react";
import "./AllContestants.css";

interface AllContestantsProps {
  contest: Contest;
  /** All contestants in this contest, ranked by live votes. */
  roster: Contestant[];
  onSelect: (c: Contestant) => void;
  onBack: () => void;
}

/**
 * Full contestants page for one contest — every entrant in a grid that
 * ADAPTS to the roster size: the more contestants, the smaller/denser the
 * cards (auto columns), so 8 or 80 entrants both look intentional.
 */
/** Contestants per page on the view-all grid. */
const PAGE_SIZE = 16;

/** Full contestants page for one contest — every entrant in a grid that
    ADAPTS to the roster size, with pagination + a search box to narrow it. */
export default function AllContestants({
  contest,
  roster,
  onSelect,
  onBack,
}: AllContestantsProps) {
  const [query, setQuery] = useState("");
  useEffect(() => setQuery(""), [contest.id]);
  const q = query.trim().toLowerCase();
  const searched = q
    ? roster.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          String(c.number).includes(q) ||
          c.state.toLowerCase().includes(q) ||
          (c.occupation ?? "").toLowerCase().includes(q),
      )
    : roster;

  // Pagination (16 per page) — resets when the contest or search changes.
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(searched.length / PAGE_SIZE));
  useEffect(() => setPage(1), [contest.id, q]);
  const pageSafe = Math.min(page, pages);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const visible = searched.slice(start, start + PAGE_SIZE);

  // Column count scales with roster size (clamped so tiny/huge lists stay sane).
  const n = searched.length;
  const cols = n <= 4 ? 2 : n <= 8 ? 3 : n <= 20 ? 4 : n <= 40 ? 5 : 6;

  return (
    <main className={`allcontestants allcontestants--c${cols}`}>
      <button className="allcontestants__back" onClick={onBack}>
        <ChevronLeft size={18} /> {contest.title}
      </button>

      <header className="allcontestants__head">
        <h1 className="allcontestants__title">
          <Users size={20} /> All Contestants
        </h1>
        <p className="allcontestants__sub">
          {roster.length} contestant{roster.length === 1 ? "" : "s"} · ranked by
          live votes
        </p>
      </header>

      <div className="allcontestants__search">
        <Search size={15} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${roster.length} contestants…`}
        />
        {query && (
          <button
            className="allcontestants__search-clear"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="allcontestants__grid">
        {visible.map((c, i) => (
          <button
            key={c.apiId ?? c.id}
            className="allcontestants__card"
            onClick={() => onSelect(c)}
          >
            <div className="allcontestants__imgwrap">
              <img src={c.heroImage} alt={c.name} loading="lazy" />
              {!q && (
                <span className="allcontestants__rank">#{start + i + 1}</span>
              )}
              <span className="allcontestants__number">#{c.number}</span>
            </div>
            <div className="allcontestants__body">
              <span className="allcontestants__name">{c.name}</span>
              <span className="allcontestants__state">{c.state}</span>
              <span className="allcontestants__votes">
                {c.votes.toLocaleString()} votes
              </span>
            </div>
          </button>
        ))}
      </div>

      {pages > 1 && (
        <nav className="allcontestants__pager">
          <button
            disabled={pageSafe <= 1}
            onClick={() => {
              setPage((p) => p - 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <ChevronLeft size={15} /> Prev
          </button>
          <span>
            Page {pageSafe} of {pages}
          </span>
          <button
            disabled={pageSafe >= pages}
            onClick={() => {
              setPage((p) => p + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Next <ChevronRight size={15} />
          </button>
        </nav>
      )}

      {searched.length === 0 && (
        <p className="allcontestants__empty">
          No contestant matches “{query}”.
        </p>
      )}

      <div className="app__footer-spacer" />
    </main>
  );
}
