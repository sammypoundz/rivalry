import { useEffect } from "react";
import { formatNaira, type Contest, type Contestant } from "../data";
import { rosterOf } from "../lib/queries";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Vote,
  Trophy,
  Flame,
  CalendarDays,
  Clock,
  ExternalLink,
} from "lucide-react";
import "./MyContests.css";

interface MyContestsProps {
  /** Every contest the logged-in user has entered (live roster data). */
  joined: Contest[];
  allContestants: Contestant[];
  onOpenContest: (c: Contest) => void;
  onViewAllContestants: (c: Contest) => void;
  onSelectContestant: (c: Contestant) => void;
  onBack: () => void;
}

/**
 * All joined contests AT ONCE — one screen listing every contest the user
 * has entered, with a live banner card per contest (standings, top 3,
 * contestant count and a direct "View all contestants" shortcut).
 */
export default function MyContests({
  joined,
  allContestants,
  onOpenContest,
  onViewAllContestants,
  onSelectContestant,
  onBack,
}: MyContestsProps) {
  const medals = ["🥇", "🥈", "🥉"];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <main className="mycontests">
      <button className="mycontests__back" onClick={onBack}>
        <ChevronLeft size={18} /> Home
      </button>

      <header className="mycontests__head">
        <h1 className="mycontests__title">My Contests</h1>
        <p className="mycontests__sub">
          {joined.length} joined contest{joined.length === 1 ? "" : "s"} · all
          in one place
        </p>
      </header>

      {joined.length === 0 && (
        <div className="mycontests__empty">
          <Flame size={28} />
          <strong>You haven't joined any contest yet</strong>
          <p>
            Head to the Contests tab and join one — your entries all show up
            here.
          </p>
        </div>
      )}

      <div className="mycontests__list">
        {joined.map((contest) => {
          const roster = rosterOf(contest, allContestants);
          return (
            <div key={contest.apiId ?? contest.id} className="mycontests__card">
              {/* Banner — whole card opens the contest */}
              <button
                className="mycontests__banner"
                onClick={() => onOpenContest(contest)}
                aria-label={`Open ${contest.title}`}
              >
                <img
                  src={contest.coverImage}
                  alt={contest.title}
                  loading="lazy"
                />
                <div className="mycontests__banner-overlay">
                  <span
                    className={`contest-card__badge contest-card__badge--${contest.status}`}
                  >
                    {contest.status === "voting-live" ? (
                      <>
                        <Flame size={11} /> Voting Live
                      </>
                    ) : contest.status === "upcoming" ? (
                      <>
                        <CalendarDays size={11} /> Upcoming
                      </>
                    ) : (
                      "Ended"
                    )}
                  </span>
                  <h2>{contest.title}</h2>
                  <p>{contest.tagline}</p>
                  <span className="mycontests__banner-time">
                    <Clock size={11} />
                    {contest.endsAt > Date.now()
                      ? `${Math.floor((contest.endsAt - Date.now()) / 86400000)}d left`
                      : "Ended"}
                  </span>
                </div>
              </button>

              <div className="mycontests__body">
                <div className="mycontests__stats">
                  <span>
                    <Users size={12} /> {roster.length} contestants
                  </span>
                  <span>
                    <Vote size={12} /> {contest.totalVotes.toLocaleString()}{" "}
                    votes
                  </span>
                  <span>
                    <Trophy size={12} />{" "}
                    {contest.rewards[0]
                      ? formatNaira(contest.rewards[0].amount)
                      : "—"}
                  </span>
                </div>

                <h3 className="mycontests__heading">Leaderboard</h3>
                <div className="mycontests__podium">
                  {roster.slice(0, 3).map((c, i) => (
                    <button
                      key={c.apiId ?? c.id}
                      className={`mycontests__podium-btn mycontests__podium-btn--${i + 1}`}
                      onClick={() => onSelectContestant(c)}
                    >
                      <span className="mycontests__medal">{medals[i]}</span>
                      <img src={c.heroImage} alt={c.name} loading="lazy" />
                      <span className="mycontests__podium-name">{c.name}</span>
                      <span className="mycontests__podium-votes">
                        {c.votes.toLocaleString()} votes
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mycontests__actions">
                  <button
                    className="mycontests__view-all"
                    onClick={() => onViewAllContestants(contest)}
                  >
                    View all {roster.length} contestants
                    <ChevronRight size={14} strokeWidth={2.2} />
                  </button>
                  <button
                    className="mycontests__open"
                    onClick={() => onOpenContest(contest)}
                  >
                    <ExternalLink size={13} strokeWidth={2.1} />
                    Open contest
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="app__footer-spacer" />
    </main>
  );
}
