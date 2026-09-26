import { type Contestant, type Contest, formatNaira } from "../data";
import {
  Swords,
  ChevronRight,
  Gift,
  LogIn,
  ExternalLink,
  Users,
  Vote,
  Trophy,
} from "lucide-react";
import "./Dashboard.css";

interface DashboardProps {
  onSelect: (contestant: Contestant) => void;
  joinedContest: Contest | null;
  onOpenContest: (contest: Contest) => void;
  contests: Contest[];
  /** Full contestant list (live data or seed) used to build each contest roster. */
  allContestants: Contestant[];
  onEarn: () => void;
  /** Opens the sign-in overlay (shown on mobile in place of the Earn button). */
  onSignIn?: () => void;
}

const medals = ["🥇", "🥈", "🥉"];

/** Contestants belonging to a contest, ranked by votes. */
function rosterOf(contest: Contest, allContestants: Contestant[]): Contestant[] {
  const list = contest.contestantApiIds?.length
    ? allContestants.filter((c) =>
        c.apiId ? contest.contestantApiIds!.includes(c.apiId) : false,
      )
    : allContestants.filter((c) => contest.contestantIds.includes(c.id));
  return [...list].sort((a, b) => b.votes - a.votes);
}

export default function Dashboard({ onSelect, joinedContest, onOpenContest, contests, allContestants, onEarn, onSignIn }: DashboardProps) {

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__header-row">
          <div>
            <h1 className="dashboard__title">Rivalry</h1>
            <p className="dashboard__subtitle">Season 1 — Vote for your queen</p>
          </div>
          {onSignIn ? (
            <button className="dashboard__signin" onClick={onSignIn}>
              <LogIn size={16} strokeWidth={2.1} />
              Sign in
            </button>
          ) : null}
          <button className="dashboard__earn" onClick={onEarn}>
            <Gift size={16} strokeWidth={2.1} />
            Earn
          </button>
        </div>
      </header>

      {joinedContest && (
        <button
          className="joined-contest-banner"
          onClick={() => onOpenContest(joinedContest)}
        >
          <span className="joined-contest-banner__icon">
            <Swords size={18} />
          </span>
          <span className="joined-contest-banner__text">
            <strong>You're in: {joinedContest.title}</strong>
            <span>Tap to view votes, rewards &amp; standings</span>
          </span>
          <ChevronRight size={18} />
        </button>
      )}

      {/* One preview block per contest — cover, standings & its own roster */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Contests</h2>
        <div className="dashboard__contest-list">
          {contests.map((contest) => {
            const roster = rosterOf(contest, allContestants);
            return (
              <div key={contest.id} className="home-contest">
                <div className="home-contest__cover">
                  <img src={contest.coverImage} alt={contest.title} loading="lazy" />
                  <div className="home-contest__cover-overlay">
                    <span className={`contest-card__badge contest-card__badge--${contest.status}`}>
                      {contest.status === "voting-live"
                        ? "Voting Live"
                        : contest.status === "upcoming"
                          ? "Upcoming"
                          : "Ended"}
                    </span>
                    <h3 className="home-contest__title">{contest.title}</h3>
                    <p className="home-contest__tagline">{contest.tagline}</p>
                    <div className="home-contest__meta">
                      <span>
                        <Users size={12} /> {roster.length} contestants
                      </span>
                      <span>
                        <Vote size={12} /> {contest.totalVotes.toLocaleString()} votes
                      </span>
                      <span>
                        <Trophy size={12} /> {contest.rewards[0] ? formatNaira(contest.rewards[0].amount) : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="home-contest__inner">
                  {/* Per-contest leaderboard (top 3) */}
                  <h4 className="home-contest__heading">
                    <Trophy size={13} /> Leaderboard
                  </h4>
                  <div className="home-contest__podium">
                    {roster.slice(0, 3).map((c, i) => (
                      <button
                        key={c.id}
                        className={`home-podium home-podium--${i + 1}`}
                        onClick={() => onSelect(c)}
                      >
                        <span className="home-podium__medal">{medals[i]}</span>
                        <img
                          className="home-podium__img"
                          src={c.heroImage}
                          alt={c.name}
                          loading="lazy"
                        />
                        <span className="home-podium__name">{c.name}</span>
                        <span className="home-podium__votes">{c.votes.toLocaleString()} votes</span>
                      </button>
                    ))}
                  </div>

                  {/* Per-contest contestants — former card-grid layout, summary only */}
                  <h4 className="home-contest__heading">
                    <Users size={13} /> Contestants
                  </h4>
                  <div className="dashboard__grid home-contest__grid">
                    {roster.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        className="contestant-card"
                        onClick={() => onSelect(c)}
                      >
                        <div className="contestant-card__img-wrap">
                          <img
                            className="contestant-card__img"
                            src={c.heroImage}
                            alt={c.name}
                            loading="lazy"
                          />
                          <span className="contestant-card__number">#{c.number}</span>
                        </div>
                        <div className="contestant-card__body">
                          <span className="contestant-card__name">{c.name}</span>
                          <span className="contestant-card__state">{c.state}</span>
                          <span className="contestant-card__votes">
                            {c.votes.toLocaleString()} votes
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="home-contest__actions">
                    <button
                      className="home-contest__view-all"
                      onClick={() => onOpenContest(contest)}
                    >
                      View all {roster.length} contestants
                      <ChevronRight size={15} strokeWidth={2.2} />
                    </button>
                    <button
                      className="contest-preview__open home-contest__open"
                      onClick={() => onOpenContest(contest)}
                    >
                      <ExternalLink size={14} strokeWidth={2.1} />
                      Open contest
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
