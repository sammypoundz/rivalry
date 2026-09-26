import type { Contest, Contestant } from "../data";
import { ChevronLeft, Users } from "lucide-react";
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
export default function AllContestants({
  contest,
  roster,
  onSelect,
  onBack,
}: AllContestantsProps) {
  // Column count scales with roster size (clamped so tiny/huge lists stay sane).
  const n = roster.length;
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

      <div className="allcontestants__grid">
        {roster.map((c, i) => (
          <button
            key={c.apiId ?? c.id}
            className="allcontestants__card"
            onClick={() => onSelect(c)}
          >
            <div className="allcontestants__imgwrap">
              <img src={c.heroImage} alt={c.name} loading="lazy" />
              <span className="allcontestants__rank">#{i + 1}</span>
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

      <div className="app__footer-spacer" />
    </main>
  );
}
