import { useState } from "react";
import { formatNaira } from "../data";
import { Trophy, Swords, ChevronRight, Users, Clock } from "lucide-react";
import type { Contest, Contestant } from "../data";
import { rosterOf } from "../lib/queries";
import "./DesktopSidebar.css";

interface DesktopSidebarProps {
  /** Live contests from the backend (falls back to seed data). */
  contests: Contest[];
  /** Live contestants across all contests (ranked by live votes). */
  allContestants: Contestant[];
  onOpenContest: (c: Contest) => void;
  onSelectContestant: (c: Contestant) => void;
}

const fmtLeft = (endsAt: number) => {
  const ms = endsAt - Date.now();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (ms <= 0) return "Ended";
  if (d > 0) return `${d}d ${h}h left`;
  return `${h}h left`;
};

/** At most this many contests get a leaderboard block before "view more". */
const MAX_CONTEST_LEADERBOARDS = 3;
/** Rows shown per contest leaderboard. */
const ROWS_PER_CONTEST = 3;

export default function DesktopSidebar({
  contests,
  allContestants,
  onOpenContest,
  onSelectContestant,
}: DesktopSidebarProps) {
  // Collapsed: only the first 3 contests get a leaderboard block; expanded:
  // every contest does.
  const [showAll, setShowAll] = useState(false);
  const rankedContests = contests.filter((c) =>
    rosterOf(c, allContestants).length > 0,
  );
  const shownContests = showAll
    ? rankedContests
    : rankedContests.slice(0, MAX_CONTEST_LEADERBOARDS);

  return (
    <aside className="desktop-sidebar">
      <section className="desktop-sidebar__section">
        <h2 className="desktop-sidebar__heading">
          <Swords size={14} /> Contests
        </h2>
        <div className="desktop-sidebar__list">
          {contests.map((c) => (
            <button
              key={c.apiId ?? c.id}
              className="desktop-sidebar__row"
              onClick={() => onOpenContest(c)}
            >
              <img src={c.coverImage} alt={c.title} loading="lazy" />
              <div className="desktop-sidebar__info">
                <strong>{c.title}</strong>
                <span>
                  <Clock size={11} /> {fmtLeft(c.endsAt)} ·{" "}
                  {c.rewards[0] ? formatNaira(c.rewards[0].amount) : "—"}
                </span>
              </div>
              <ChevronRight size={14} />
            </button>
          ))}
          {contests.length === 0 && (
            <p className="desktop-sidebar__empty">No contests yet</p>
          )}
        </div>
      </section>

      <section className="desktop-sidebar__section">
        <h2 className="desktop-sidebar__heading">
          <Trophy size={14} /> Leaderboard
        </h2>
        {/* One leaderboard block per contest — live votes, top 3 each.
            Collapsed shows at most 3 contests; the button below reveals
            the rest. */}
        {shownContests.map((contest) => {
          const roster = rosterOf(contest, allContestants);
          return (
            <div key={contest.apiId ?? contest.id} className="desktop-sidebar__lb">
              <h3
                className="desktop-sidebar__lb-title"
                onClick={() => onOpenContest(contest)}
              >
                {contest.title}
              </h3>
              <div className="desktop-sidebar__list">
                {roster.slice(0, ROWS_PER_CONTEST).map((c, i) => (
                  <button
                    key={c.apiId ?? c.id}
                    className="desktop-sidebar__row"
                    onClick={() => onSelectContestant(c)}
                  >
                    <span className="desktop-sidebar__rank">{i + 1}</span>
                    <img src={c.heroImage} alt={c.name} loading="lazy" />
                    <div className="desktop-sidebar__info">
                      <strong>{c.name}</strong>
                      <span>
                        <Users size={11} /> {c.votes.toLocaleString()} votes
                      </span>
                    </div>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {rankedContests.length > MAX_CONTEST_LEADERBOARDS && !showAll && (
          <button
            className="desktop-sidebar__more"
            onClick={() => setShowAll(true)}
          >
            View more contests leaderboard
            <ChevronRight size={13} />
          </button>
        )}
        {showAll && rankedContests.length > MAX_CONTEST_LEADERBOARDS && (
          <button
            className="desktop-sidebar__more"
            onClick={() => setShowAll(false)}
          >
            Show less
          </button>
        )}
        {rankedContests.length === 0 && (
          <p className="desktop-sidebar__empty">No live contests yet</p>
        )}
      </section>
    </aside>
  );
}
